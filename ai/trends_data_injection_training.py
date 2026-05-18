import pandas as pd
import ast
import time
from datetime import datetime
from pytrends.request import TrendReq

# Initialize Pytrends (PH Timezone offset: 480)
pytrends = TrendReq(hl='en-US', tz=480)

# Downstream destinations update automatically
base_name = "legislation_input_v2"
input_file = f"data/{base_name}.csv"
audit_output_file = f"data/{base_name}_output.csv"
ml_output_file = f"data/{base_name}_ml_training.csv"

print(f"=== Starting LegisLatency CSV Processing Pipeline ===")
print(f"Reading: {input_file}...\n")

try:
    # Read the input CSV
    df = pd.read_csv(input_file)
    df.columns = df.columns.str.strip()
    
    # Initialize empty lists to hold our newly engineered features
    peak_keyword_list = []
    peak_date_list = []
    raw_latency_list = []
    abs_latency_list = []
    classification_list = []
    context_list = []

    # Loop through every row/law in your spreadsheet
    for index, row in df.iterrows():
        ra_num = row['Republic Act Number']
        print(f"Processing row {index + 1}/{len(df)}: {ra_num}")
        
        # 1. Safely parse the Date Signed column
        try:
            leg_date = pd.to_datetime(row['Date Signed']).to_pydatetime()
        except Exception as e:
            print(f"   [ERROR] Could not parse date '{row['Date Signed']}' for {ra_num}: {e}")
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append(None)
            continue

        # 2. Safely convert string representation of array into a true Python list
        try:
            keywords = ast.literal_eval(row['Keywords'])
            keywords = [kw.strip() for kw in keywords][:5] 
        except Exception as e:
            print(f"   [ERROR] Could not parse keywords array for {ra_num}: {e}")
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append(None)
            continue

        # 3. Pull Multi-Keyword Normalized Data from Google Trends
        try:
            print(f"   Fetching Trends for keywords: {keywords}")
            pytrends.build_payload(keywords, cat=0, timeframe='2022-05-01 2026-05-01', geo='PH')
            data = pytrends.interest_over_time()

            if not data.empty:
                if 'isPartial' in data.columns:
                    data = data.drop(columns=['isPartial'])

                max_per_keyword = data[keywords].max()
                highest_score = max_per_keyword.max()
                strongest_kw = max_per_keyword.idxmax()
                peak_date = data[strongest_kw].idxmax().to_pydatetime()

                # 4. Mathematical Latency Calculations
                delta = leg_date - peak_date
                raw_latency_days = delta.days
                abs_latency_days = abs(raw_latency_days)

                # 5. Theoretical Feature Classification
                if raw_latency_days >= 0:
                    classification = "Ex-Ante"
                    context = "Trends peaked before or on legislation date"
                else:
                    classification = "Ex-Post"
                    context = "Trends peaked after legislation date"

                # Append calculated values to our lists
                peak_keyword_list.append(strongest_kw)
                peak_date_list.append(peak_date.strftime('%Y-%m-%d'))
                raw_latency_list.append(raw_latency_days)
                abs_latency_list.append(abs_latency_days)
                classification_list.append(classification)
                context_list.append(context)
                
                print(f"   [SUCCESS] {classification} Latency extracted: {abs_latency_days} days.")

            else:
                print(f"   [WARNING] No trends data returned from Google for {ra_num}.")
                for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                    lst.append(None)

        except Exception as e:
            print(f"   [ERROR] Google Trends API failure for {ra_num}: {e}")
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append(None)

        time.sleep(6)

    # 6. Bind the newly engineered feature columns to master frame
    df['Trends_Peak_Keyword'] = peak_keyword_list
    df['Trends_Peak_Date'] = peak_date_list
    df['Raw_Vector_Days'] = raw_latency_list
    df['Absolute_Latency_Days'] = abs_latency_list
    df['Outcry_Classification'] = classification_list
    df['Outcry_Context'] = context_list

    # Drop any rows completely ruined by API blocks or empty date syntax
    df_clean = df.dropna(subset=['Absolute_Latency_Days']).copy()

    # =====================================================================
    # OUTPUT FILE #1: Save standard tracking sheet (Audit & Reference log)
    # =====================================================================
    df_clean.to_csv(audit_output_file, index=False)
    print(f"\n[OUTPUT 1] Standard file saved to: '{audit_output_file}'")

    # =====================================================================
    # OUTPUT FILE #2: Generate The ML/NLP Training Matrix
    # =====================================================================
    print("Building numeric vector splits for machine learning output...")
    ml_df = pd.DataFrame()

    # Feature A: Construct a highly descriptive string for the NLP Embedding Engine
    ml_df['NLP_Embedding_Text'] = df_clean['Short Title'] + " - " + df_clean['Full Title']

    # Feature B: Encode the categorical Ex-Ante structure into a 1 or 0 numeric vector
    ml_df['is_ex_ante'] = (df_clean['Outcry_Classification'] == "Ex-Ante").astype(int)

    # Feature C: Parse comma-separated text categories into distinct multi-hot dummy flags
    # This prevents the category column from remaining a string.
    categories_split = df_clean['Categories'].str.get_dummies(sep=', ')
    # Clean column spacing to bypass model syntax traps
    categories_split.columns = ['Category_' + col.replace(' ', '_').replace('&', 'and') for col in categories_split.columns]
    
    # Merge the binary category flags right into the ML structure
    ml_df = pd.concat([ml_df, categories_split], axis=1)

    # Target Variable (Y): The numeric objective label the XGBoost model must predict
    ml_df['Absolute_Latency_Days'] = df_clean['Absolute_Latency_Days'].astype(int)

    # Save out to a clean ML training dataset
    ml_df.to_csv(ml_output_file, index=False)
    
    print(f"[OUTPUT 2] ML-Optimized training file saved to: '{ml_output_file}'")
    print("\n" + "="*60)
    print("Pipeline Completed Successfully! Both outputs generated.")
    print("="*60)

except FileNotFoundError:
    print(f"[FATAL ERROR] Could not find the file '{input_file}'.")
except Exception as e:
    print(f"[FATAL ERROR] Pipeline crashed: {e}")