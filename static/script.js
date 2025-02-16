function extractIPs(text) {
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}\b/g;
    return [...new Set(text.match(ipRegex) || [])]; // Remove duplicates using Set
}

function defangText(text) {
    return text ? text.replace(/\./g, "[.]") : "N/A";
}

// Store risky IPs globally to mark them in both extracted and reputation results
let riskyIPs = new Set();

function formatExtractedIPs(ips) {
    return [...new Set(ips)].map(ip => { // Ensure unique IPs
        let color = riskyIPs.has(ip) ? "red" : "white";
        return `<div style="color: ${color};">- ${ip}</div>`;
    }).join("");
}

function formatReputationResults(data) {
    let resultHtml = "";
    riskyIPs.clear(); // Reset before processing new results

    for (const [ip, details] of Object.entries(data)) {
        let formattedDetails = [];
        let isRisky = false;

        if (!details.Error) {
            formattedDetails.push(`Score: ${details.Score}%`);
            formattedDetails.push(`Country: ${details.Country}`);
            formattedDetails.push(`ISP: ${details.ISP}`);
            formattedDetails.push(`Hostname: ${defangText(details.Hostname)}`);
            formattedDetails.push(`Usage Type: ${details["Usage Type"]}`);
            formattedDetails.push(`Domain: ${defangText(details.Domain)}`);

            // Check if IP is risky (Score > 0 or Reports > 0)
            if (parseInt(details.Score) > 0 || parseInt(details.Reports || "0") > 0) {
                isRisky = true;
                riskyIPs.add(ip); // Store malicious IPs for extracted list
            }
        } else {
            formattedDetails.push(`Error: ${details.Error}`);
        }

        let formattedLine = `- ${ip} (${formattedDetails.join(", ")})`;
        resultHtml += `<div style="color: ${isRisky ? 'red' : 'white'};">${formattedLine}</div>`;
    }

    // Update the reputation results
    document.getElementById("result").innerHTML = resultHtml;

    // Update extracted IPs panel with highlighted malicious IPs
    let inputIPs = extractIPs(document.getElementById("ipText").value);
    document.getElementById("extractedIPs").innerHTML = formatExtractedIPs([...new Set([...inputIPs, ...riskyIPs])]); // Merge & remove duplicates
}

function checkIP() {
    let ipText = document.getElementById("ipText").value;
    let ips = extractIPs(ipText);

    if (ips.length === 0) {
        alert("No valid IPs found!");
        return;
    }

    // Display extracted IPs first (temporary, final update happens in formatReputationResults)
    document.getElementById("extractedIPs").innerHTML = formatExtractedIPs(ips);

    // Query AbuseIPDB
    fetch("/check-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipText })
    })
    .then(response => response.json())
    .then(data => {
        formatReputationResults(data);
    })
    .catch(error => console.error("Error:", error));
}

function copyToClipboard(id) {
    let resultText = document.getElementById(id).innerText;
    navigator.clipboard.writeText(resultText)
        .then(() => alert("Copied to clipboard!"))
        .catch(err => console.error("Copy failed", err));
}

function pasteFromClipboard() {
    navigator.clipboard.readText()
        .then(text => {
            document.getElementById("ipText").value = text;
        })
        .catch(err => console.error("Failed to read clipboard: ", err));
}
