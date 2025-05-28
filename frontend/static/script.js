document.addEventListener('DOMContentLoaded', function () {
    const profileForm = document.getElementById('profileForm');

    profileForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        // Collect data from input fields
        const location = document.getElementById('location').value;
        const numOccupants = parseInt(document.getElementById('num_occupants').value, 10);
        const homeSizeSqft = parseFloat(document.getElementById('home_size_sqft').value);
        
        const electricityKwhInput = document.getElementById('electricity_kwh');
        const electricityKwh = electricityKwhInput.value ? parseFloat(electricityKwhInput.value) : null;
        
        const electricityCostInput = document.getElementById('electricity_cost');
        const electricityCost = electricityCostInput.value ? parseFloat(electricityCostInput.value) : null;

        const waterGallonsInput = document.getElementById('water_gallons');
        const waterGallons = waterGallonsInput.value ? parseFloat(waterGallonsInput.value) : null;

        const waterCostInput = document.getElementById('water_cost');
        const waterCost = waterCostInput.value ? parseFloat(waterCostInput.value) : null;


        // Construct JSON object
        const profileData = {
            geographic_location: location,
            household_details: {
                num_occupants: numOccupants,
                home_size_sqft: homeSizeSqft
            },
            utility_usage: {
                electricity_kwh_monthly: electricityKwh,
                electricity_cost_per_kwh: electricityCost,
                water_gallons_monthly: waterGallons,
                water_cost_per_gallon: waterCost
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
                    <p><strong>Location:</strong> ${solarData.input_location_string || 'N/A'} (Lat: ${solarData.retrieved_latitude || 'N/A'}, Lon: ${solarData.retrieved_longitude || 'N/A'})</p>
                    <p><strong>Geocoding Source:</strong> <em>${solarData.geocoding_data_source || 'N/A'}</em></p>
                    
                    <h4>Energy Production Estimate</h4>
                    <p>Requested System Capacity: ${solarData.requested_system_capacity_kw || 'N/A'} kW</p>
                    <p>Estimated Annual Energy Production: <strong>${solarData.estimated_annual_ac_kwh === null || solarData.estimated_annual_ac_kwh === undefined ? 'N/A' : solarData.estimated_annual_ac_kwh + ' kWh AC'}</strong></p>
                    <p>Solar Data Source: <em>${solarData.solar_data_source || 'N/A'}</em></p>
                    <p>Notes: <em>${solarData.notes || 'N/A'}</em></p>

                    <h4>Financial Analysis (Solar)</h4>
                    <p>Estimated System Cost: <strong>$${solarData.estimated_system_cost_dollars === null || solarData.estimated_system_cost_dollars === undefined ? 'N/A' : solarData.estimated_system_cost_dollars.toFixed(2)}</strong> (at $${solarData.default_solar_install_cost_per_watt_used || 'N/A'}/Watt)</p>
                    <p>Estimated Annual Savings: <strong>$${solarData.estimated_annual_savings_dollars === null || solarData.estimated_annual_savings_dollars === undefined ? 'N/A' : solarData.estimated_annual_savings_dollars.toFixed(2)}</strong> (using ${solarData.user_electricity_cost_per_kwh_used === null || solarData.user_electricity_cost_per_kwh_used === undefined ? 'N/A' : '$' + solarData.user_electricity_cost_per_kwh_used.toFixed(2) + '/kWh'} from ${solarData.source_of_electricity_cost || 'N/A'})</p>
                    <p>Simple Payback Period: <strong>${solarData.simple_payback_period_years === null || solarData.simple_payback_period_years === undefined ? 'N/A' : solarData.simple_payback_period_years + ' years'}</strong></p>
                    <p>Financial Notes:</p>
                    <ul>${(solarData.financial_notes || []).map(note => `<li><em>${note}</em></li>`).join('')}</ul>

                    <h4>Environmental Impact (Solar)</h4>
                    <p>Estimated Annual CO2 Reduction: <strong>${solarData.estimated_annual_co2_reduction_kg === null || solarData.estimated_annual_co2_reduction_kg === undefined ? 'N/A' : solarData.estimated_annual_co2_reduction_kg.toFixed(2) + ' kg'}</strong> (using ${solarData.default_co2_emissions_factor_kg_per_kwh_used || 'N/A'} kg CO2/kWh)</p>
                    <p>Environmental Notes:</p>
                    <ul>${(solarData.environmental_notes || []).map(note => `<li><em>${note}</em></li>`).join('')}</ul>
                `;
                // Optionally display PVWatts inputs if needed for debugging/advanced view
                // solarResultsDiv.innerHTML += `<details><summary>PVWatts API Inputs</summary><pre>${JSON.stringify(solarData.pvwatts_api_inputs, null, 2)}</pre></details>`;
            }

            // Display Rainwater Data
            if (rainwaterData.error) {
                rainwaterResultsDiv.innerHTML = `<h3>Rainwater Harvesting Assessment</h3><p class="error">Error: ${rainwaterData.error}</p>`;
            } else {
                rainwaterResultsDiv.innerHTML = `
                    <h3>Rainwater Harvesting Assessment</h3>
                    <p><strong>Location:</strong> ${rainwaterData.input_location_string || 'N/A'} (Lat: ${rainwaterData.retrieved_latitude || 'N/A'}, Lon: ${rainwaterData.retrieved_longitude || 'N/A'})</p>
                    <p><strong>Geocoding Source:</strong> <em>${rainwaterData.geocoding_data_source || 'N/A'}</em>. ${rainwaterData.geocoding_notes || ''}</p>
                    
                    <h4>Water Collection Estimate</h4>
                    <p>Source Annual Rainfall: ${rainwaterData.annual_rainfall_inches_source_data === null || rainwaterData.annual_rainfall_inches_source_data === undefined ? 'N/A' : rainwaterData.annual_rainfall_inches_source_data + ' inches/year'}</p>
                    <p>Collection Area Used: ${rainwaterData.collection_area_used_sqft === null || rainwaterData.collection_area_used_sqft === undefined ? 'N/A' : rainwaterData.collection_area_used_sqft + ' sq ft'}</p>
                    <p>Estimated Annual Collection: <strong>${rainwaterData.estimated_annual_gallons === null || rainwaterData.estimated_annual_gallons === undefined ? 'N/A' : rainwaterData.estimated_annual_gallons + ' Gallons'}</strong></p>
                    <p>Rainfall Data Source: <em>${rainwaterData.rainfall_data_source || 'N/A'}</em></p>
                    <p>Collection Notes: <em>${rainwaterData.notes || 'N/A'}</em></p>

                    <h4>Financial Analysis (Rainwater)</h4>
                    <p>Estimated System Cost: <strong>$${rainwaterData.estimated_rainwater_system_cost_dollars === null || rainwaterData.estimated_rainwater_system_cost_dollars === undefined ? 'N/A' : rainwaterData.estimated_rainwater_system_cost_dollars.toFixed(2)}</strong> (for a ${rainwaterData.estimated_rainwater_system_storage_capacity_gallons_assumed || 'N/A'} gallon system at $${rainwaterData.default_rainwater_system_cost_per_gallon_storage_used || 'N/A'}/gallon storage)</p>
                    <p>Estimated Annual Savings: <strong>$${rainwaterData.estimated_annual_water_savings_dollars === null || rainwaterData.estimated_annual_water_savings_dollars === undefined ? 'N/A' : rainwaterData.estimated_annual_water_savings_dollars.toFixed(2)}</strong> (using ${rainwaterData.user_water_cost_per_gallon_used === null || rainwaterData.user_water_cost_per_gallon_used === undefined ? 'N/A' : '$' + rainwaterData.user_water_cost_per_gallon_used.toFixed(4) + '/gallon'} from ${rainwaterData.source_of_water_cost || 'N/A'})</p>
                    <p>Simple Payback Period: <strong>${rainwaterData.simple_rainwater_payback_period_years === null || rainwaterData.simple_rainwater_payback_period_years === undefined ? 'N/A' : rainwaterData.simple_rainwater_payback_period_years + ' years'}</strong></p>
                    <p>Financial Notes:</p>
                    <ul>${(rainwaterData.financial_notes_rainwater || []).map(note => `<li><em>${note}</em></li>`).join('')}</ul>
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
