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

    keyword = [user_word]
    print(f"Fetching data and generating graph for '{user_word}'...")

    try:
        # This manually requests a clean, fixed 24-month window
        pytrends.build_payload(keyword, cat=0, timeframe='2024-05-01 2026-05-01', geo='PH')
        data = pytrends.interest_over_time()

        if not data.empty:
            # Pytrends sometimes adds an 'isPartial' column. We drop it so it doesn't mess up the graph.
            if 'isPartial' in data.columns:
                data = data.drop(columns=['isPartial'])

            # --- DRAW THE GRAPH ---
            plt.figure(figsize=(10, 5)) # Set the window size
            plt.plot(data.index, data[user_word], color='#1a73e8', linewidth=2) # Draw the line
            
            # Add titles and labels
            plt.title(f"Public Outcry: '{user_word}' (Last 12 Months, PH)", fontsize=14, fontweight='bold')
            plt.xlabel("Date", fontsize=12)
            plt.ylabel("Relative Search Volume (0-100)", fontsize=12)
            plt.grid(True, linestyle='--', alpha=0.7) # Add a subtle background grid
            
            # Show the graph! (The script will pause here until you close the graph window)
            plt.show() 
            print("-" * 40 + "\n")
            
        else:
            print(f"\nNo data found for '{user_word}'.\n")
            
    except Exception as e:
        print(f"\nOops! Something went wrong. Error: {e}\n")