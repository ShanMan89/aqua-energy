# HomeHarvest - Your Personalized Home Sustainability Roadmap

This project helps homeowners understand the requirements and benefits of making their homes more sustainable. It provides assessments for solar power potential and rainwater harvesting, along with educational resources.

## Features

*   **User Profiling:** Input your location, household details, and utility usage, including optional average costs for electricity and water to personalize financial estimates.
*   **Solar Assessment:**
    *   Estimates potential annual solar energy generation using the NREL PVWatts API, based on geocoded location.
    *   Provides financial analysis including estimated system cost, annual savings (using user-provided or default electricity cost), and simple payback period.
    *   Estimates annual CO2 emissions reduction based on solar energy production and an average grid emissions factor.
*   **Rainwater Harvesting Assessment:**
    *   Estimates potential average annual rainwater collection by fetching ~30 years of historical daily precipitation data from the Visual Crossing Weather API for the geocoded location and calculating the average.
    *   Provides financial analysis including estimated system cost (for a default storage size), annual savings (using user-provided or default water cost), and simple payback period based on this live rainfall data.
*   **Atmospheric Water Generation (AWG) Assessment:**
    *   Estimates potential daily and annual water yield from a hypothetical standard residential AWG unit.
    *   Uses yesterday's average daily temperature and relative humidity (fetched from Visual Crossing API for the geocoded location) as inputs to a simplified, internal lookup table model.
*   **Educational Content:** Information about solar power and rainwater harvesting.
*   **Personalized Roadmap (Placeholder):** Future feature for a step-by-step sustainability plan.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd HomeHarvest
    ```

2.  **Create a Python virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up Environment Variables (API Keys):**
    Create a file named `.env` in the project root directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    Open the `.env` file and add your API keys. The `.env` file is included in `.gitignore` and should not be committed to version control.

    *   **NREL PVWatts API (for Solar Assessment):**
        *   **Purpose:** Provides solar irradiance data and estimates solar panel energy production.
        *   **Obtain Key:** Sign up at [https://developer.nrel.gov/signup/](https://developer.nrel.gov/signup/)
        *   **`.env` Variable:** `NREL_API_KEY=YOUR_NREL_API_KEY_HERE`

    *   **OpenCage Geocoding API (for Location to Coordinates):**
        *   **Purpose:** Converts user-provided location strings (like addresses or place names) into latitude and longitude coordinates, which are then used by the solar assessment and live rainfall data lookup.
        *   **Obtain Key:** Sign up at [https://opencagedata.com/users/sign_up](https://opencagedata.com/users/sign_up)
        *   **`.env` Variable:** `OPENCAGE_API_KEY=YOUR_OPENCAGE_API_KEY_HERE`
        *   **Note on Free Trial:** OpenCage offers a free trial with daily request limits (e.g., 2,500 requests/day). For sustained use beyond testing, a paid plan would be required.

    *   **Visual Crossing Weather API (for Live Rainfall & AWG Weather Data):**
        *   **Purpose:**
            *   Provides historical daily weather data, used to calculate a ~30-year average annual rainfall for the geocoded location (for Rainwater Harvesting Assessment).
            *   Provides yesterday's average daily temperature and relative humidity for the geocoded location (for AWG Assessment).
        *   **Obtain Key:** Sign up at [https://www.visualcrossing.com/sign-up/](https://www.visualcrossing.com/sign-up/)
        *   **`.env` Variable:** `VISUALCROSSING_API_KEY=YOUR_VISUALCROSSING_API_KEY_HERE`
        *   **Note on Free Tier/Usage:** Visual Crossing offers a free tier (e.g., 1000 records/day).
            *   Fetching ~30 years of daily rainfall data (~10,950 records) will exceed this daily limit for a new location not yet cached. Pay-as-you-go costs are low ($0.0001/record). Rainfall data is cached for 30 days.
            *   Fetching yesterday's weather for AWG (1 record) is well within free limits, and this data is also cached (30 days).

5.  **Understanding User Inputs for Personalized Estimates (Optional):**
    When using the application's frontend, you can input:
    *   **Average Electricity Cost ($/kWh):** If provided, this value is used to calculate potential savings from solar energy. If not provided, a default value is used.
    *   **Average Water Cost ($/gallon):** If provided, this value is used to calculate potential savings from rainwater harvesting. If not provided, a default value is used.
    These inputs allow for more personalized financial estimates.

6.  **Run the Flask application:**
    ```bash
    python backend/app.py
    ```
    The application will typically be available at `http://127.0.0.1:5000/`.

## Assumptions, Defaults, and Key Limitations

The application uses several default values and assumptions for its calculations, especially for financial and environmental estimates. These are used when user-specific data is not provided or for aspects of the calculation that are standardized for the MVP.

**Default Values:**

*   **Solar System Installation Cost:** $3.00 per Watt (`DEFAULT_SOLAR_INSTALL_COST_PER_WATT`)
*   **Electricity Cost:** $0.15 per kWh (`DEFAULT_ELECTRICITY_COST_PER_KWH`) - Used if not provided by the user.
*   **Rainwater System Storage Cost:** $2.00 per gallon of storage capacity (`DEFAULT_RAINWATER_SYSTEM_COST_PER_GALLON_STORAGE`)
*   **Assumed Rainwater Storage Capacity:** 1000 gallons (`DEFAULT_RAINWATER_STORAGE_CAPACITY_GALLONS`) - Used for estimating system cost.
*   **Water Cost:** $0.004 per gallon (`DEFAULT_WATER_COST_PER_GALLON`) - Used if not provided by the user.
*   **CO2 Emissions Factor:** 0.45 kg CO2 per kWh (`DEFAULT_CO2_EMISSIONS_FACTOR_KG_PER_KWH`) - Based on an average US grid electricity emissions factor.
*   **Historical Rainfall Data:** ~30 years of daily data is fetched from Visual Crossing API to calculate the average annual rainfall.

**Key Financial Assumptions & Limitations:**

*   **Simple Payback Period:** The payback period calculations are "simple," meaning they do not account for:
    *   Inflation or changes in utility rates over time.
    *   System degradation (e.g., solar panel efficiency decrease over years).
    *   Ongoing maintenance costs.
    *   Financing costs (e.g., loan interest).
    *   Tax credits, rebates, or other incentives (which can significantly reduce net costs and shorten payback).
*   **System Costs:** Estimated system costs are very high-level and based on the defaults above. Actual costs can vary significantly based on specific equipment chosen, installer, location, and complexity of installation.
*   **Rainwater System Sizing:** The rainwater system cost is based on a default storage capacity. A real system would be sized based on rainfall, collection area, and water demand.
*   **Savings Accuracy:** Savings are directly tied to the energy/water cost inputs (user-provided or default) and the estimated production/collection.

**Environmental & Data Source Assumptions & Limitations:**

*   **Solar Assessment:**
    *   Uses OpenCage Geocoding API for location-to-coordinate conversion.
    *   Uses NREL PVWatts API for solar energy production estimates.
    *   Accuracy depends on the geocoding result and PVWatts model.
*   **Rainwater Data Source:**
    *   Rainfall estimation now uses live historical data from the Visual Crossing Weather API (~30 years of daily data) to calculate an average annual rainfall for the geocoded location.
    *   Geocoding (OpenCage) is essential for this process. If geocoding fails, live rainfall data cannot be fetched.
    *   **If Visual Crossing API call fails (e.g., API key issue, network error, no data for location), or if geocoding fails, the average annual rainfall defaults to 0.0 inches for the assessment.**
    *   Successfully fetched rainfall data is cached for 30 days to improve performance and reduce API calls for repeated locations.
*   **CO2 Emissions:** The CO2 reduction for solar is an estimate based on displacing average grid electricity. Actual displaced emissions can vary significantly by region (due to different grid mixes) and time of day.
*   **Rainfall Data Accuracy:** The accuracy of rainfall data depends on the Visual Crossing API and the ~30-year historical average. Actual future rainfall can vary. If API calls fail, rainfall is assumed to be 0.0 inches.
*   **Atmospheric Water Generation (AWG) Model:**
    *   **Yield Method:** AWG yield is estimated using an internal lookup table (`AWG_YIELD_LOOKUP_TABLE` in `backend/app.py`). This table provides estimated Gallons/Day based on discrete bands of ambient temperature (°C) and relative humidity (%).
    *   **Hypothetical Unit:** The lookup table represents a hypothetical, generic residential AWG unit. It does not model any specific commercial product.
    *   **Weather Data Source:** Temperature and relative humidity data used as input to the model are fetched from the Visual Crossing API for the geocoded location, specifically using *yesterday's average daily values* as a proxy for current typical conditions. This data is cached for 30 days.
    *   **Assumptions & Limitations:**
        *   Actual AWG unit performance varies significantly by make, model, size, efficiency, and specific site conditions.
        *   The model uses simplified bands and does not interpolate between them.
        *   Energy consumption of the AWG unit is not estimated.
        *   If weather data from Visual Crossing cannot be fetched (due to API issues, geocoding failure, or if the location is not supported by the weather API), or if the fetched temperature/humidity fall outside the lookup table's defined bands, the estimated yield will default to 0.0 Gallons/Day.
        *   The annual yield is a simple multiplication of the estimated daily yield by 365, assuming consistent daily conditions.
*   **Roadmap Feature:** The personalized roadmap is a placeholder.


## API Endpoints

(This section would be for developers using the API directly. For the MVP, it's a brief overview.)

*   `/api/profile` (POST): Accepts user profile data including location, household details, and utility usage (with optional costs).
*   `/api/solar_assessment` (GET): Takes a `location` string and optional `home_size_sqft`.
    *   Returns solar energy potential (from NREL PVWatts), financial estimates (system cost, annual savings, simple payback period), and CO2 reduction estimates.
    *   Key financial fields: `user_electricity_cost_per_kwh_used`, `source_of_electricity_cost`, `estimated_annual_savings_dollars`, `default_solar_install_cost_per_watt_used`, `estimated_system_cost_dollars`, `simple_payback_period_years`, `financial_notes`.
    *   Key environmental fields: `default_co2_emissions_factor_kg_per_kwh_used`, `estimated_annual_co2_reduction_kg`, `environmental_notes`.
    *   Also includes geocoding information: `input_location_string`, `retrieved_latitude`, `retrieved_longitude`, `geocoding_data_source`.
*   `/api/rainwater_assessment` (GET): Takes a `location` string and optional `home_size_sqft`.
    *   Returns rainwater collection potential (based on live historical data from Visual Crossing API) and financial estimates (system cost, annual savings, simple payback period).
    *   Key data fields: `annual_rainfall_inches_source_data` (average from API), `rainfall_data_source` (e.g., "Visual Crossing API (live average)" or "Visual Crossing API (failed/zero) - No fallback available").
    *   Key financial fields: `user_water_cost_per_gallon_used`, `source_of_water_cost`, `estimated_annual_water_savings_dollars`, `default_rainwater_system_cost_per_gallon_storage_used`, `estimated_rainwater_system_storage_capacity_gallons_assumed`, `estimated_rainwater_system_cost_dollars`, `simple_rainwater_payback_period_years`, `financial_notes_rainwater`.
    *   Also includes geocoding information: `input_location_string`, `retrieved_latitude`, `retrieved_longitude`, `geocoding_data_source`, `geocoding_notes`.
    *   The `notes` field (list) will contain details about the data source, number of years averaged if successful, or reasons for failure.
*   `/api/awg_assessment` (GET): Takes a `location` string.
    *   Returns potential daily and annual water yield from a hypothetical Atmospheric Water Generator.
    *   Estimates are based on yesterday's average daily temperature and relative humidity for the geocoded location (from Visual Crossing API) and an internal lookup table model.
    *   Key data fields: `input_location_string`, `retrieved_latitude`, `retrieved_longitude`, `geocoding_data_source`, `geocoding_notes`, `awg_weather_data_source`, `awg_weather_source_notes`, `temperature_celsius_used`, `relative_humidity_percent_used`, `estimated_daily_yield_gallons`, `estimated_annual_yield_gallons`, `awg_yield_model_source`, `notes`.

The actual API responses contain more detailed fields; these highlights cover the main additions.
