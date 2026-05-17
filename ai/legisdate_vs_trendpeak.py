import pandas as pd
from datetime import datetime
from pytrends.request import TrendReq
import matplotlib.pyplot as plt

# Connect to Google (Timezone Offset: PH is +8 hours or 480 mins)
pytrends = TrendReq(hl='en-US', tz=480)

print("=== LegisLatency: Google Trends Visualizer ===")
print("(Type 'quit' at any time to exit the program)\n")

while True:
    user_word = input("Enter a keyword to search and graph in the Philippines: ")
    
    if user_word.lower() == 'quit':
        print("Exiting program. Goodbye!")
        break
        
    if not user_word.strip():
        print("Please enter a valid word.\n")
        continue

    # Ask user for the legislation date and validate the format
    leg_date_input = input("Enter the date the law was signed (YYYY-MM-DD): ")
    try:
        leg_date = datetime.strptime(leg_date_input.strip(), "%Y-%m-%d")
    except ValueError:
        print("Invalid date format. Please use YYYY-MM-DD (e.g., 2024-10-23).\n")
        continue

    keyword = [user_word]
    print(f"Fetching data and generating graph for '{user_word}'...")

    try:
        # Requesting a 24-month window (Adjusted start to capture longer trends)
        pytrends.build_payload(keyword, cat=0, timeframe='2022-05-01 2026-05-01', geo='PH')
        data = pytrends.interest_over_time()

        if not data.empty:
            if 'isPartial' in data.columns:
                data = data.drop(columns=['isPartial'])

            # --- CALCULATE THE LATENCY ---
            peak_score = data[user_word].max()
            peak_date = data[user_word].idxmax()
            
            # Calculate the days between the peak outcry and the legislation date
            delta = leg_date - peak_date.to_pydatetime()
            latency_days = delta.days

            # --- EX-ANTE vs EX-POST CLASSIFICATION LOGIC ---
            if latency_days >= 0:
                classification = "Ex-Ante"
                description = "Trends peaked before or on the legislation date"
            else:
                classification = "Ex-Post"
                description = "Trends peaked after the legislation date"

            # Print the extracted features to the terminal
            print("\n" + "="*50)
            print(f"RESULTS FOR: '{user_word}'")
            print(f"Classification: {classification}")
            print(f"Context:        ({description})")
            print("-" * 50)
            print(f"Peak Outcry Date: {peak_date.strftime('%Y-%m-%d')} (Score: {peak_score})")
            print(f"Legislation Date: {leg_date.strftime('%Y-%m-%d')}")
            print(f"Absolute Latency: {abs(latency_days)} days (Data Engine Feature Distance)")
            print(f"Raw Vector Days:  {latency_days} days")
            print("="*50 + "\n")

            # --- DRAW THE GRAPH ---
            plt.figure(figsize=(10, 5)) 
            plt.plot(data.index, data[user_word], color='#1a73e8', linewidth=2, label="Search Volume") 
            
            # Add vertical lines for the Peak Date and Legislation Date
            plt.axvline(x=peak_date, color='green', linestyle='--', label=f'Peak Outcry ({peak_date.strftime("%Y-%m-%d")})')
            plt.axvline(x=leg_date, color='red', linestyle='--', label=f'Law Signed ({leg_date.strftime("%Y-%m-%d")})')
            
            # Dynamically push the classification right into the plot title for visual audit checks
            plt.title(f"Public Outcry vs Legislation: '{user_word}' (PH)\nClassification: {classification}", fontsize=12, fontweight='bold')
            plt.xlabel("Date", fontsize=11)
            plt.ylabel("Relative Search Volume (0-100)", fontsize=11)
            plt.grid(True, linestyle='--', alpha=0.7) 
            plt.legend(loc='upper left') 
            
            # Show the graph
            plt.show() 
            print("-" * 50 + "\n")
            
        else:
            print(f"\nNo data found for '{user_word}'.\n")
            
    except Exception as e:
        print(f"\nOops! Something went wrong. Error: {e}\n")