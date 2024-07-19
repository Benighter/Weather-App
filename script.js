const themeSelect = document.getElementById('themeSelect');
const citySelect = document.getElementById('citySelect');
const unitSelect = document.getElementById('unitSelect');
const currentTemp = document.getElementById('currentTemp');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const weatherDetails = document.getElementById('weatherDetails');
const dateTimeElement = document.getElementById('dateTime');
const localTimeElement = document.getElementById('localTime');
const forecastContainer = document.getElementById('forecast');
const advancedMetricsContainer = document.getElementById('advancedMetrics');
const airQualityIndex = document.getElementById('airQualityIndex');
const airQualityDescription = document.getElementById('airQualityDescription');
const weatherAlerts = document.getElementById('weatherAlerts');
const tabs = document.querySelectorAll('.tab');
const modal = document.getElementById('forecastModal');
const modalDate = document.getElementById('modalDate');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementsByClassName('close')[0];
let chart;
let weatherData;
let airQualityData;
let alertsData;

themeSelect.addEventListener('change', changeTheme);
citySelect.addEventListener('change', handleCityChange);
unitSelect.addEventListener('change', updateDisplayUnits);
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        updateChart(tab.dataset.tab);
    });
});

closeModal.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function changeTheme() {
    document.body.className = `theme-${themeSelect.value}`;
    if (chart) {
        updateChartColors();
    }
}

function handleCityChange() {
    if (citySelect.value === 'myLocation') {
        getUserLocation();
    } else {
        fetchWeatherData();
    }
}

function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchWeatherData(lat, lon);
            updateLocationName(lat, lon);
        }, function(error) {
            console.error("Error getting user location:", error);
            alert("Unable to retrieve your location. Please select a city manually.");
        });
    } else {
        alert("Geolocation is not supported by your browser. Please select a city manually.");
    }
}

async function updateLocationName(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        const cityName = data.address.city || data.address.town || data.address.village || "Unknown Location";
        
        const option = document.createElement('option');
        option.value = `${lat},${lon}`;
        option.textContent = `${cityName} (Current Location)`;
        option.selected = true;
        
        const currentLocationOption = citySelect.querySelector('option[data-is-current-location]');
        if (currentLocationOption) {
            citySelect.removeChild(currentLocationOption);
        }
        
        option.setAttribute('data-is-current-location', 'true');
        citySelect.insertBefore(option, citySelect.firstChild);
    } catch (error) {
        console.error("Error fetching location name:", error);
    }
}

async function fetchWeatherData(lat, lon) {
    const coordinates = lat && lon ? `${lat},${lon}` : citySelect.value;
    const [latitude, longitude] = coordinates.split(',');
    const units = unitSelect.value;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,windspeed_10m,relativehumidity_2m,apparent_temperature,uv_index,pressure_msl,visibility,cloudcover&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&current_weather=true&timezone=auto&temperature_unit=${units === 'imperial' ? 'fahrenheit' : 'celsius'}&windspeed_unit=${units === 'imperial' ? 'mph' : 'kmh'}`;
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi`;

    try {
        const [weatherResponse, airQualityResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(airQualityUrl)
        ]);
        weatherData = await weatherResponse.json();
        airQualityData = await airQualityResponse.json();
        
        displayWeatherInfo();
        updateChart('temperature');
        displayForecast();
        displayAdvancedMetrics();
        displayAirQuality();
        fetchWeatherAlerts(latitude, longitude);
    } catch (error) {
        console.error('Error fetching data:', error);
        weatherDetails.innerHTML = 'Failed to fetch weather data. Please try again later.';
    }
}

function displayWeatherInfo() {
    const current = weatherData.current_weather;
    const units = unitSelect.value;
    currentTemp.textContent = `${Math.round(current.temperature)}°${units === 'imperial' ? 'F' : 'C'}`;
    weatherIcon.textContent = getWeatherIcon(current.weathercode);
    weatherDescription.textContent = getWeatherDescription(current.weathercode);
    weatherDetails.innerHTML = `
        <p>Precipitation: ${weatherData.hourly.precipitation_probability[0]}%</p>
        <p>Humidity: ${weatherData.hourly.relativehumidity_2m[0]}%</p>
        <p>Wind: ${current.windspeed} ${units === 'imperial' ? 'mph' : 'km/h'}</p>
    `;
    updateDateTime();
    updateLocalTime();
}

function updateDateTime() {
    const now = moment().format('dddd, MMMM Do YYYY, HH:mm:ss');
    dateTimeElement.textContent = now;
}

function updateLocalTime() {
    const timezone = weatherData.timezone;
    const localTime = moment().tz(timezone).format('HH:mm:ss');
    localTimeElement.textContent = `Local Time: ${localTime}`;
}

function getWeatherIcon(weatherCode) {
    // More detailed weather icon mapping
    const iconMap = {
        0: '☀️', // Clear sky
        1: '🌤️', // Mainly clear
        2: '⛅', // Partly cloudy
        3: '☁️', // Overcast
        45: '🌫️', // Fog
        48: '🌫️', // Depositing rime fog
        51: '🌦️', // Light drizzle
        53: '🌦️', // Moderate drizzle
        55: '🌧️', // Dense drizzle
        56: '🌨️', // Light freezing drizzle
        57: '🌨️', // Dense freezing drizzle
        61: '🌧️', // Slight rain
        63: '🌧️', // Moderate rain
        65: '🌧️', // Heavy rain
        66: '🌨️', // Light freezing rain
        67: '🌨️', // Heavy freezing rain
        71: '🌨️', // Slight snow fall
        73: '🌨️', // Moderate snow fall
        75: '❄️', // Heavy snow fall
        77: '❄️', // Snow grains
        80: '🌦️', // Slight rain showers
        81: '🌧️', // Moderate rain showers
        82: '🌧️', // Violent rain showers
        85: '🌨️', // Slight snow showers
        86: '❄️', // Heavy snow showers
        95: '⛈️', // Thunderstorm
        96: '⛈️', // Thunderstorm with slight hail
        99: '⛈️'  // Thunderstorm with heavy hail
    };
    return iconMap[weatherCode] || '❓';
}

function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[weatherCode] || 'Unknown weather condition';
}

function updateChart(dataType) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    let hourlyData, label;

    switch(dataType) {
        case 'temperature':
            hourlyData = weatherData.hourly.temperature_2m.slice(0, 24);
            label = 'Temperature';
            break;
        case 'precipitation':
            hourlyData = weatherData.hourly.precipitation_probability.slice(0, 24);
            label = 'Precipitation Probability';
            break;
        case 'wind':
            hourlyData = weatherData.hourly.windspeed_10m.slice(0, 24);
            label = 'Wind Speed';
            break;
        case 'humidity':
            hourlyData = weatherData.hourly.relativehumidity_2m.slice(0, 24);
            label = 'Relative Humidity';
            break;
    }

    const labels = weatherData.hourly.time.slice(0, 24).map(time => moment(time).format('HH:mm'));

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = hourlyData;
        chart.data.datasets[0].label = label;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: hourlyData,
                    borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                    backgroundColor: getComputedStyle(document.body).getPropertyValue('--secondary-color') + '40',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: dataType !== 'temperature',
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color') + '20'
                        },
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color')
                        }
                    },
                    x: {
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color') + '20'
                        },
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color')
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
}

function displayForecast() {
    forecastContainer.innerHTML = '';
    const units = unitSelect.value;
    for (let i = 0; i < 7; i++) {
        const day = moment(weatherData.daily.time[i]).format('ddd');
        const icon = getWeatherIcon(weatherData.daily.weathercode[i]);
        const high = Math.round(weatherData.daily.temperature_2m_max[i]);
        const low = Math.round(weatherData.daily.temperature_2m_min[i]);

        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-day';
        dayElement.innerHTML = `
            <div>${day}</div>
            <div class="forecast-icon">${icon}</div>
            <div class="forecast-temp">
                <span class="high">${high}°</span>
                <span class="low">${low}°</span>
            </div>
        `;
        dayElement.addEventListener('click', () => showDayDetails(i));
        forecastContainer.appendChild(dayElement);
    }
}

function showDayDetails(dayIndex) {
    const day = moment(weatherData.daily.time[dayIndex]);
    modalDate.textContent = day.format('dddd, MMMM Do YYYY');
    
    const highTemp = weatherData.daily.temperature_2m_max[dayIndex];
    const lowTemp = weatherData.daily.temperature_2m_min[dayIndex];
    const weatherCode = weatherData.daily.weathercode[dayIndex];
    const sunrise = moment(weatherData.daily.sunrise[dayIndex]).format('HH:mm');
    const sunset = moment(weatherData.daily.sunset[dayIndex]).format('HH:mm');

    modalContent.innerHTML = `
        <p>High: ${highTemp}°${unitSelect.value === 'imperial' ? 'F' : 'C'}</p>
        <p>Low: ${lowTemp}°${unitSelect.value === 'imperial' ? 'F' : 'C'}</p>
        <p>Weather: ${getWeatherDescription(weatherCode)} ${getWeatherIcon(weatherCode)}</p>
        <p>Sunrise: ${sunrise}</p>
        <p>Sunset: ${sunset}</p>
    `;

    modal.style.display = "block";
}

function displayAdvancedMetrics() {
    const metrics = [
        { label: 'UV Index', value: weatherData.hourly.uv_index[0].toFixed(1) },
        { label: 'Pressure', value: `${(weatherData.hourly.pressure_msl[0] / 100).toFixed(0)} hPa` },
        { label: 'Feels Like', value: `${weatherData.hourly.apparent_temperature[0].toFixed(1)}°${unitSelect.value === 'imperial' ? 'F' : 'C'}` },
        { label: 'Visibility', value: `${(weatherData.hourly.visibility[0] / 1000).toFixed(1)} km` },
        { label: 'Cloud Cover', value: `${weatherData.hourly.cloudcover[0]}%` },
        { label: 'Sunrise', value: moment(weatherData.daily.sunrise[0]).format('HH:mm') },
        { label: 'Sunset', value: moment(weatherData.daily.sunset[0]).format('HH:mm') }
    ];

    advancedMetricsContainer.innerHTML = metrics.map(metric => `
        <div class="metric">
            <div class="metric-value">${metric.value}</div>
            <div class="metric-label">${metric.label}</div>
        </div>
    `).join('');
}

function displayAirQuality() {
    const aqi = airQualityData.hourly.european_aqi[0];
    airQualityIndex.textContent = aqi;
    airQualityDescription.textContent = getAirQualityDescription(aqi);
    airQualityIndex.className = `air-quality-${getAirQualityLevel(aqi)}`;
}

function getAirQualityDescription(aqi) {
    if (aqi <= 20) return 'Excellent';
    if (aqi <= 40) return 'Good';
    if (aqi <= 60) return 'Moderate';
    if (aqi <= 80) return 'Poor';
    if (aqi <= 100) return 'Very Poor';
    return 'Extremely Poor';
}

function getAirQualityLevel(aqi) {
    if (aqi <= 20) return 'excellent';
    if (aqi <= 40) return 'good';
    if (aqi <= 60) return 'moderate';
    if (aqi <= 80) return 'poor';
    if (aqi <= 100) return 'very-poor';
    return 'extremely-poor';
}

async function fetchWeatherAlerts(latitude, longitude) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=current,minutely,hourly,daily&appid=YOUR_OPENWEATHERMAP_API_KEY`);
        const data = await response.json();
        alertsData = data.alerts || [];
        displayWeatherAlerts();
    } catch (error) {
        console.error('Error fetching weather alerts:', error);
        weatherAlerts.innerHTML = 'Failed to fetch weather alerts.';
    }
}

function displayWeatherAlerts() {
    if (alertsData.length === 0) {
        weatherAlerts.innerHTML = '<p>No active weather alerts.</p>';
        return;
    }

    weatherAlerts.innerHTML = alertsData.map(alert => `
        <div class="alert">
            <h3>${alert.event}</h3>
            <p>${alert.description}</p>
            <p>Start: ${moment(alert.start * 1000).format('MMMM Do YYYY, HH:mm')}</p>
            <p>End: ${moment(alert.end * 1000).format('MMMM Do YYYY, HH:mm')}</p>
        </div>
    `).join('');
}

function updateChartColors() {
    chart.data.datasets[0].borderColor = getComputedStyle(document.body).getPropertyValue('--primary-color');
    chart.data.datasets[0].backgroundColor = getComputedStyle(document.body).getPropertyValue('--secondary-color') + '40';
    chart.options.scales.y.grid.color = getComputedStyle(document.body).getPropertyValue('--text-color') + '20';
    chart.options.scales.y.ticks.color = getComputedStyle(document.body).getPropertyValue('--text-color');
    chart.options.scales.x.grid.color = getComputedStyle(document.body).getPropertyValue('--text-color') + '20';
    chart.options.scales.x.ticks.color = getComputedStyle(document.body).getPropertyValue('--text-color');
    chart.update();
}

function updateDisplayUnits() {
    fetchWeatherData();
}

// Initialize the app
if ("geolocation" in navigator) {
    getUserLocation();
} else {
    fetchWeatherData();
}
setInterval(updateDateTime, 1000);
setInterval(updateLocalTime, 1000);