document.addEventListener('DOMContentLoaded', function () {
    const profileForm = document.getElementById('profileForm');

    profileForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        // Collect data from input fields
        const location = document.getElementById('location').value;
        const numOccupants = parseInt(document.getElementById('num_occupants').value, 10);
        const homeSizeSqft = parseFloat(document.getElementById('home_size_sqft').value);
        const electricityKwh = document.getElementById('electricity_kwh').value ? parseFloat(document.getElementById('electricity_kwh').value) : null;
        const waterGallons = document.getElementById('water_gallons').value ? parseFloat(document.getElementById('water_gallons').value) : null;

        // Construct JSON object
        const profileData = {
            geographic_location: location,
            household_details: {
                num_occupants: numOccupants,
                home_size_sqft: homeSizeSqft
            },
            utility_usage: {
                electricity_kwh_monthly: electricityKwh,
                water_gallons_monthly: waterGallons
            }
        };

        // Send data to the backend
        fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Profile submitted successfully! Fetching assessments...');
                // Fetch assessments
                fetchAssessments(profileData.geographic_location, profileData.household_details.home_size_sqft);
                // Optionally, clear the form or redirect (consider if user wants to see inputs with results)
                // profileForm.reset(); 
            } else {
                alert('Error submitting profile: ' + data.message);
                console.error('Profile Error:', data);
            }
        })
        .catch((error) => {
            console.error('Profile Fetch Error:', error);
            alert('An error occurred while submitting your profile. Please try again.');
        });
    });

    function fetchAssessments(location, homeSizeSqft) {
        const solarResultsDiv = document.getElementById('solar-results');
        const rainwaterResultsDiv = document.getElementById('rainwater-results');

        solarResultsDiv.innerHTML = '<p>Loading solar assessment...</p>';
        rainwaterResultsDiv.innerHTML = '<p>Loading rainwater assessment...</p>';

        const solarUrl = `/api/solar_assessment?location=${encodeURIComponent(location)}&home_size_sqft=${homeSizeSqft}`;
        const rainwaterUrl = `/api/rainwater_assessment?location=${encodeURIComponent(location)}&home_size_sqft=${homeSizeSqft}`;

        Promise.all([
            fetch(solarUrl).then(res => res.json()),
            fetch(rainwaterUrl).then(res => res.json())
        ])
        .then(([solarData, rainwaterData]) => {
            // Display Solar Data
            if (solarData.error) {
                solarResultsDiv.innerHTML = `<h3>Solar Power Assessment</h3><p class="error">Error: ${solarData.error}</p>`;
            } else {
                solarResultsDiv.innerHTML = `
                    <h3>Solar Power Assessment</h3>
                    <p>Location (Zipcode): ${solarData.location_zipcode} (Lat: ${solarData.latitude}, Lon: ${solarData.longitude})</p>
                    <p>Requested System Capacity: ${solarData.requested_system_capacity_kw} kW</p>
                    <p>Estimated Annual Energy Production: <strong>${solarData.estimated_annual_ac_kwh} kWh AC</strong></p>
                    <p>Data Source: <em>${solarData.data_source}</em></p>
                    <p>Notes: <em>${solarData.notes}</em></p>
                `;
                // Optionally display PVWatts inputs if needed for debugging/advanced view
                // solarResultsDiv.innerHTML += `<details><summary>PVWatts API Inputs</summary><pre>${JSON.stringify(solarData.inputs_to_pvwatts, null, 2)}</pre></details>`;
            }

            // Display Rainwater Data
            if (rainwaterData.error) {
                rainwaterResultsDiv.innerHTML = `<h3>Rainwater Harvesting Assessment</h3><p class="error">Error: ${rainwaterData.error}</p>`;
            } else {
                rainwaterResultsDiv.innerHTML = `
                    <h3>Rainwater Harvesting Assessment</h3>
                    <p>Location (Zipcode): ${rainwaterData.location_zipcode}</p>
                    <p>Source Annual Rainfall: ${rainwaterData.annual_rainfall_inches_source_data} inches/year</p>
                    <p>Collection Area Used: ${rainwaterData.collection_area_used_sqft} sq ft</p>
                    <p>Estimated Annual Collection: <strong>${rainwaterData.estimated_annual_gallons} Gallons</strong></p>
                    <p>Data Source: <em>${rainwaterData.data_source}</em></p>
                    <p>Notes: <em>${rainwaterData.notes}</em></p>
                `;
            }
        })
        .catch(error => {
            console.error('Assessment Fetch Error:', error);
            solarResultsDiv.innerHTML = '<p>Could not fetch solar assessment data.</p>';
            rainwaterResultsDiv.innerHTML = '<p>Could not fetch rainwater assessment data.</p>';
            alert('An error occurred while fetching sustainability assessments.');
        });
    }
});
