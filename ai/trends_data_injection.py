import pandas as pd
import ast
import time
from datetime import datetime
from pytrends.request import TrendReq

# Initialize Pytrends (PH Timezone offset: 480)
pytrends = TrendReq(hl='en-US', tz=480)

# Filenames - update these as needed
input_file = "data/legislation_input_v1.csv"
output_file = "data/legislation_input_v1_output.csv"

print(f"=== Starting LegisLatency CSV Processing Pipeline ===")
print(f"Reading: {input_file}...\n")

try:
    # Read the input CSV
    df = pd.read_csv(input_file)
    
    # Standardize spaces in header names just in case
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
        
        # 1. Safely parse the Date Signed column (e.g., "October 23, 2025")
        try:
            leg_date = pd.to_datetime(row['Date Signed']).to_pydatetime()
        except Exception as e:
            print(f"   [ERROR] Could not parse date '{row['Date Signed']}' for {ra_num}: {e}")
            # Append nulls if the row date is fundamentally corrupted
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append(None)
            continue

        # 2. Safely convert string representation of array '["kw1", "kw2"]' into a true Python list
        try:
            keywords = ast.literal_eval(row['Keywords'])
            # Ensure it's a list and strip extra spaces from keywords
            keywords = [kw.strip() for kw in keywords][:5] # Google Trends limits max 5 keywords
        except Exception as e:
            print(f"   [ERROR] Could not parse keywords array for {ra_num}: {e}")
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append(None)
            continue

        # 3. Pull Multi-Keyword Normalized Data from Google Trends
        try:
            print(f"   Fetching Trends for keywords: {keywords}")
            # Requesting fixed historical data window spanning the target legislative timeline
            pytrends.build_payload(keywords, cat=0, timeframe='2022-05-01 2026-05-01', geo='PH')
            data = pytrends.interest_over_time()

            if not data.empty:
                if 'isPartial' in data.columns:
                    data = data.drop(columns=['isPartial'])

                # Find the maximum score across the keyword columns
                max_per_keyword = data[keywords].max()
                highest_score = max_per_keyword.max()
                
                # Identify WHICH specific keyword hit the highest peak
                strongest_kw = max_per_keyword.idxmax()
                
                # Identify WHEN that specific keyword peaked
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
                    lst.append("No Google Trends Data")

        except Exception as e:
            print(f"   [ERROR] Google Trends API failure for {ra_num}: {e}")
            for lst in [peak_keyword_list, peak_date_list, raw_latency_list, abs_latency_list, classification_list, context_list]:
                lst.append("API Error")

        # CRITICAL RATE-LIMIT GUARD: Government/Google audits require courtesy sleep windows.
        # This prevents Google from blocking your machine with a 429 Too Many Requests error code.
        time.sleep(6)

    # 6. Bind the newly engineered feature columns back onto your original DataFrame structure
    df['Trends_Peak_Keyword'] = peak_keyword_list
    df['Trends_Peak_Date'] = peak_date_list
    df['Raw_Vector_Days'] = raw_latency_list
    df['Absolute_Latency_Days'] = abs_latency_list
    df['Outcry_Classification'] = classification_list
    df['Outcry_Context'] = context_list

    # 7. Save out to a fresh new machine-learning ready spreadsheet CSV file
    df.to_csv(output_file, index=False)
    print(f"\n" + "="*60)
    print(f"Pipeline Completed Successfully!")
    print(f"Feature-engineered dataset saved to: '{output_file}'")
    print("="*60)

except FileNotFoundError:
    print(f"[FATAL ERROR] Could not find the file '{input_file}'. Please place it in the same directory as this script.")
except Exception as e:
    print(f"[FATAL ERROR] Pipeline crashed: {e}")