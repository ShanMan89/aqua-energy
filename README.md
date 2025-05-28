# HomeHarvest - Your Personalized Home Sustainability Roadmap

This project helps homeowners understand the requirements and benefits of making their homes more sustainable. It provides assessments for solar power potential and rainwater harvesting, along with educational resources.

## Features

*   **User Profiling:** Input your location, household details, and utility usage.
*   **Solar Assessment:** Estimates potential annual solar energy generation using the NREL PVWatts API.
*   **Rainwater Harvesting Assessment:** Estimates potential annual rainwater collection.
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
        *   **`.env` Variable:** `NREL_API_KEY=YOUR_ACTUAL_NREL_API_KEY`

    *   **OpenCage Geocoding API (for Location to Coordinates):**
        *   **Purpose:** Converts user-provided location strings (like addresses or place names) into latitude and longitude coordinates, which are then used by the solar assessment.
        *   **Obtain Key:** Sign up at [https://opencagedata.com/users/sign_up](https://opencagedata.com/users/sign_up)
        *   **`.env` Variable:** `OPENCAGE_API_KEY=YOUR_ACTUAL_OPENCAGE_API_KEY`
        *   **Note on Free Trial:** OpenCage offers a free trial with daily request limits (e.g., 2,500 requests/day). For sustained use beyond testing, a paid plan would be required. See their [pricing page](https://opencagedata.com/pricing) for details.

5.  **Run the Flask application:**
    ```bash
    python backend/app.py
    ```
    The application will typically be available at `http://127.0.0.1:5000/`.

## Current Limitations

*   **Solar Assessment:**
    *   The solar assessment feature uses the OpenCage Geocoding API to convert the user-provided location string into latitude and longitude coordinates.
    *   These coordinates are then passed to the NREL PVWatts API to estimate solar energy potential.
    *   The accuracy of the solar assessment is dependent on the accuracy of the geocoded coordinates returned by OpenCage for the input location.
*   **Rainwater Data Source:**
    *   The rainwater harvesting assessment attempts to geocode the provided location string using OpenCage to obtain coordinates (which are included in the API response for informational purposes or future use).
    *   However, the actual rainfall data used for estimation is still based on a hardcoded dictionary (`RAINFALL_DATA` in `backend/app.py`) which uses the original input location string (e.g., a zipcode) for lookup.
    *   **It does not use a live API for rainfall data based on the geocoded coordinates.** This is a known limitation, and future development aims to integrate a live meteorological API.
*   **Roadmap Feature:** The personalized roadmap is a placeholder and not yet implemented.
