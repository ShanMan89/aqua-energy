from flask import Flask, request, jsonify, render_template
import requests
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# In-memory data store
user_profiles = []

# Hardcoded solar irradiance data (kWh/m²/day)
# Source: Made up for MVP. Real data would come from an API or more detailed database.
SOLAR_IRRADIANCE_DATA = {
    "90210": 5.5,  # Beverly Hills, CA - High sun
    "10001": 4.1,  # New York, NY - Moderate sun
    "60601": 4.3,  # Chicago, IL - Moderate sun
    "85001": 6.8,  # Phoenix, AZ - Very high sun
    "98101": 3.5,  # Seattle, WA - Lower sun
}

# System constants
DEFAULT_ROOF_AREA_M2 = 20 # Default if home_size_sqft not provided for old solar calculation
ROOF_AREA_SQFT_TO_M2_CONVERSION = 0.092903 # 1 sq ft = 0.092903 m^2
# SOLAR_SYSTEM_EFFICIENCY_FACTOR = 0.15 # 15% - Will be replaced by PVWatts

# ZIPCODE_COORDINATES dictionary is now removed, replaced by OpenCage Geocoding.

# Hardcoded average annual rainfall data (inches)
# Source: Made up for MVP. Real data would come from an API or more detailed database.
RAINFALL_DATA = {
    "90210": 15,   # Los Angeles, CA - Low rainfall
    "10001": 45,   # New York, NY - Moderate rainfall
    "60601": 38,   # Chicago, IL - Moderate rainfall
    "85001": 9,    # Phoenix, AZ - Very low rainfall
    "98101": 37,   # Seattle, WA - High rainfall (more spread out, but this is annual total)
    "33101": 60,   # Miami, FL - High rainfall
}

# Rainwater harvesting constants
DEFAULT_COLLECTION_ROOF_AREA_SQFT = 200
RAINWATER_COLLECTION_EFFICIENCY_FACTOR = 0.8 # 80%
INCHES_TO_GALLONS_CONVERSION_FACTOR = 0.623 # 1 inch of rain on 1 sq ft of area = 0.623 gallons


@app.route('/api/profile', methods=['POST'])
def create_profile():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400

    geographic_location = data.get('geographic_location')
    household_details = data.get('household_details')
    utility_usage = data.get('utility_usage')

    if not all([geographic_location, household_details, utility_usage]):
        return jsonify({'status': 'error', 'message': 'Missing required profile data'}), 400

    # Basic validation for household_details
    if not isinstance(household_details.get('num_occupants'), int) or \
       not isinstance(household_details.get('home_size_sqft'), (int, float)):
        return jsonify({'status': 'error', 'message': 'Invalid household_details format'}), 400

    # Basic validation for utility_usage
    if not isinstance(utility_usage.get('electricity_kwh_monthly'), (int, float)) or \
       not isinstance(utility_usage.get('water_gallons_monthly'), (int, float)):
        return jsonify({'status': 'error', 'message': 'Invalid utility_usage format'}), 400


    profile_data = {
        'geographic_location': geographic_location,
        'household_details': household_details,
        'utility_usage': utility_usage
    }
    
    # For MVP, we'll just overwrite any existing data.
    # A more robust solution might append to a list or use a database.
    if len(user_profiles) > 0:
        user_profiles[0] = profile_data 
    else:
        user_profiles.append(profile_data)

    return jsonify({'status': 'success', 'message': 'Profile data received', 'data': profile_data}), 201


@app.route('/api/solar_assessment', methods=['GET'])
def solar_assessment():
    location = request.args.get('location') # Zipcode
    home_size_sqft_str = request.args.get('home_size_sqft')

    nrel_api_key = os.getenv('NREL_API_KEY')
    if not nrel_api_key:
        # Log this error for server admin, but return a generic message to user
        app.logger.error("NREL_API_KEY not found in environment variables.")
        return jsonify({'error': 'Solar assessment service is currently unavailable. Please try again later.'}), 503

    if not location: # Now refers to a general location string
        return jsonify({'error': 'Location parameter (e.g., address, city, zipcode) is required'}), 400

    coordinates = get_coordinates(location)
    if not coordinates:
        return jsonify({'error': f'Could not geocode location: "{location}". Please check the location or try again later.'}), 400 # Or 503 if service unavailable

    lat = coordinates['lat']
    lon = coordinates['lon']

    # Determine system capacity
    system_capacity_kw = 4.0 # Default kW
    notes = "Estimated annual AC energy production for a default 4 kW DC system."
    if home_size_sqft_str:
        try:
            home_size_sqft = float(home_size_sqft_str)
            if home_size_sqft > 0:
                # Estimate system capacity: 1kW per 250 sqft, min 1kW, max 15kW
                system_capacity_kw = round(max(1.0, min(15.0, home_size_sqft / 250.0)), 2)
                notes = f"Estimated annual AC energy production for a {system_capacity_kw} kW DC system (estimated based on {home_size_sqft} sqft home size)."
            else:
                notes = f"Invalid home size (must be positive), using default {system_capacity_kw} kW DC system. {notes}"
        except ValueError:
            notes = f"Invalid home size format, using default {system_capacity_kw} kW DC system. {notes}"

    pvwatts_params = {
        "api_key": nrel_api_key,
        "lat": lat,
        "lon": lon,
        "system_capacity": system_capacity_kw,
        "module_type": 0,  # Standard
        "losses": 14,      # System losses in percentage (default)
        "array_type": 1,   # Fixed open rack (default)
        "tilt": lat,       # Optimal tilt is often latitude
        "azimuth": 180,    # Azimuth angle (south-facing)
        "format": "json",
        "timeframe": "hourly" # Though we only need annual, hourly might be only option for some versions/keys
    }

    api_url = "https://developer.nrel.gov/api/pvwatts/v8.json"

    try:
        response = requests.get(api_url, params=pvwatts_params, timeout=10) # Added timeout
        response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
        pvwatts_data = response.json()

        if "errors" in pvwatts_data and pvwatts_data["errors"]:
            app.logger.error(f"PVWatts API returned errors: {pvwatts_data['errors']} for location {location}")
            return jsonify({'error': f"Solar assessment service encountered an issue. Details: {'; '.join(pvwatts_data['errors'])}"}), 500

        ac_annual_kwh = pvwatts_data.get("outputs", {}).get("ac_annual")

        if ac_annual_kwh is None:
            app.logger.error(f"Could not retrieve 'ac_annual' from PVWatts response for {location}. Full response: {pvwatts_data}")
            return jsonify({'error': 'Could not retrieve the required solar output data from the assessment service.'}), 500

        return jsonify({
            'location_zipcode': location,
            'input_location_string': location,
            'retrieved_latitude': lat,
            'retrieved_longitude': lon,
            'requested_system_capacity_kw': system_capacity_kw,
            'estimated_annual_ac_kwh': round(float(ac_annual_kwh), 2),
            'notes': notes,
            'solar_data_source': 'NREL PVWatts API v8',
            'geocoding_data_source': 'OpenCage Geocoding API',
            'pvwatts_api_inputs': pvwatts_data.get("inputs", {})
        }), 200

    except requests.exceptions.Timeout:
        app.logger.error(f"PVWatts API request timed out for location {location}.")
        return jsonify({'error': 'Solar assessment service timed out. Please try again later.'}), 504
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error connecting to PVWatts API for location {location}: {str(e)}")
        return jsonify({'error': f'Could not connect to the solar assessment service: {str(e)}'}), 503
    except Exception as e: # Catch any other unexpected errors during processing
        app.logger.error(f"An unexpected error occurred during solar assessment for {location}: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


@app.route('/api/rainwater_assessment', methods=['GET'])
def rainwater_assessment():
    location_query = request.args.get('location') # User's input string for location
    home_size_sqft_str = request.args.get('home_size_sqft')

    if not location_query:
        return jsonify({'error': 'Location parameter (e.g., address, city, zipcode) is required'}), 400

    # Attempt to get coordinates for more accurate data if possible
    retrieved_lat = None
    retrieved_lon = None
    geocoding_source = None
    geocoding_notes = "Geocoding was not attempted or failed; using input location directly for hardcoded data lookup."

    coordinates = get_coordinates(location_query)
    if coordinates:
        retrieved_lat = coordinates['lat']
        retrieved_lon = coordinates['lon']
        geocoding_source = 'OpenCage Geocoding API'
        geocoding_notes = "Successfully geocoded location."
        # For rainwater, we still use the original location_query (e.g. zipcode) for hardcoded lookup
        # but the lat/lon are available for future use or more precise data sources.

    # Rainfall data is still looked up by the original location_query (assumed to be a zipcode for hardcoded data)
    annual_rainfall_inches = RAINFALL_DATA.get(location_query) # Using location_query (e.g. zipcode)

    if annual_rainfall_inches is None:
        return jsonify({
            'error': f'Rainfall data not available for location: "{location_query}" (using hardcoded data by input string).',
            'input_location_string': location_query,
            'retrieved_latitude': retrieved_lat,
            'retrieved_longitude': retrieved_lon,
            'geocoding_data_source': geocoding_source,
            'geocoding_notes': geocoding_notes + " Hardcoded rainfall lookup also failed for this input."
        }), 404

    collection_area_sqft = DEFAULT_COLLECTION_ROOF_AREA_SQFT
    rainfall_data_source_note = "Rainfall data is based on general regional averages (hardcoded) using the input location string, not live API data for specific coordinates."
    notes = f"Based on average annual rainfall for '{location_query}' (using hardcoded regional data) and default collection area ({DEFAULT_COLLECTION_ROOF_AREA_SQFT} sqft). {rainfall_data_source_note}"

    if home_size_sqft_str:
        try:
            home_size_sqft = float(home_size_sqft_str)
            if home_size_sqft <= 0:
                notes = f"Invalid home size (must be positive), using default collection area ({DEFAULT_COLLECTION_ROOF_AREA_SQFT} sqft). Based on average annual rainfall for '{location_query}' (using hardcoded regional data). {rainfall_data_source_note}"
            else:
                collection_area_sqft = home_size_sqft * 0.25
                notes = f"Based on average annual rainfall for '{location_query}' (using hardcoded regional data) and estimated collection area from home size ({home_size_sqft} sqft). {rainfall_data_source_note}"
        except ValueError:
             notes = f"Invalid home size format, using default collection area ({DEFAULT_COLLECTION_ROOF_AREA_SQFT} sqft). Based on average annual rainfall for '{location_query}' (using hardcoded regional data). {rainfall_data_source_note}"

    estimated_annual_gallons = annual_rainfall_inches * collection_area_sqft * INCHES_TO_GALLONS_CONVERSION_FACTOR * RAINWATER_COLLECTION_EFFICIENCY_FACTOR

    return jsonify({
        'input_location_string': location_query,
        'retrieved_latitude': retrieved_lat,
        'retrieved_longitude': retrieved_lon,
        'annual_rainfall_inches_source_data': annual_rainfall_inches,
        'collection_area_used_sqft': round(collection_area_sqft, 2),
        'estimated_annual_gallons': round(estimated_annual_gallons, 2),
        'notes': notes,
        'rainfall_data_source': 'Hardcoded regional averages by input string',
        'geocoding_data_source': geocoding_source,
        'geocoding_notes': geocoding_notes
    }), 200


@app.route('/')
def index():
    return render_template('index.html')

def get_coordinates(location_string):
    """
    Geocodes a location string using OpenCage API to get latitude and longitude.
    Returns a dictionary {'lat': latitude, 'lon': longitude} or None on failure.
    """
    opencage_api_key = os.getenv('OPENCAGE_API_KEY')
    if not opencage_api_key:
        app.logger.error("OPENCAGE_API_KEY not found in environment variables.")
        return None

    api_url = "https://api.opencagedata.com/geocode/v1/json"
    params = {
        'q': location_string,
        'key': opencage_api_key,
        'limit': 1,
        'no_annotations': 1 # To reduce response size and complexity
    }

    try:
        response = requests.get(api_url, params=params, timeout=10)
        response.raise_for_status()  # Raises HTTPError for bad responses (4XX or 5XX)
        
        response_data = response.json()

        if response_data.get('status', {}).get('code') != 200:
            app.logger.error(f"OpenCage API returned non-200 status: {response_data.get('status')}")
            return None

        if not response_data.get('results'):
            app.logger.warning(f"No results found from OpenCage for location: {location_string}")
            return None
            
        geometry = response_data['results'][0].get('geometry')
        if not geometry or 'lat' not in geometry or 'lng' not in geometry:
            app.logger.error(f"Invalid or missing geometry in OpenCage response for: {location_string}")
            return None
            
        latitude = geometry['lat']
        longitude = geometry['lng']
        
        return {'lat': latitude, 'lon': longitude}

    except requests.exceptions.Timeout:
        app.logger.error(f"OpenCage API request timed out for location: {location_string}")
        return None
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error connecting to OpenCage API for location {location_string}: {str(e)}")
        return None
    except Exception as e: # Catch any other unexpected errors like JSON parsing
        app.logger.error(f"An unexpected error occurred during geocoding for {location_string}: {str(e)}")
        return None

@app.route('/education/solar')
def education_solar():
    return render_template('education_solar.html')

@app.route('/education/rainwater')
def education_rainwater():
    return render_template('education_rainwater.html')

@app.route('/roadmap')
def roadmap():
    return render_template('roadmap.html')

if __name__ == '__main__':
    app.run(debug=True)
