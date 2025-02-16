import os
import re
import requests
from flask import Flask, request, render_template, jsonify
from dotenv import load_dotenv

# Load API keys from .env file
load_dotenv()
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY")

app = Flask(__name__)

# Regex pattern to extract IPv4 and IPv6
IP_REGEX = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|\b(?:[a-fA-F0-9:]+:+)+[a-fA-F0-9]+\b"

def extract_ips(text):
    """Extracts IPv4 and IPv6 addresses from input text."""
    return re.findall(IP_REGEX, text)

def check_ip_abuseipdb(ip):
    """Fetches detailed IP reputation from AbuseIPDB."""
    url = "https://api.abuseipdb.com/api/v2/check"
    headers = {"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": "90"}

    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json().get("data", {})
            return {
                "Score": f"{data.get('abuseConfidenceScore', 'N/A')}%",
                "Country": data.get("countryCode", "N/A"),
                "ISP": data.get("isp", "N/A"),
                "Hostname": data.get("hostnames", ["N/A"])[0],  # Get first hostname
                "Usage Type": data.get("usageType", "N/A"),
                "Domain": data.get("domain", "N/A")
            }
        else:
            return {"Error": f"Failed to fetch details for {ip}"}
    except Exception as e:
        return {"Error": str(e)}


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/check-ip", methods=["POST"])
def check_ip():
    data = request.json
    ips = extract_ips(data["ipText"])
    results = {ip: check_ip_abuseipdb(ip) for ip in ips}
    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
