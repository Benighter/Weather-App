const themeSelect = document.getElementById('themeSelect');
const citySelect = document.getElementById('citySelect');
const unitSelect = document.getElementById('unitSelect');
const currentTemp = document.getElementById('currentTemp');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const weatherDetails = document.getElementById('weatherDetails');
const dateTimeElement = document.getElementById('dateTime');
const forecastContainer = document.getElementById('forecast');
const advancedMetricsContainer = document.getElementById('advancedMetrics');
const tabs = document.querySelectorAll('.tab');
const modal = document.getElementById('forecastModal');
const modalDate = document.getElementById('modalDate');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementsByClassName('close')[0];
let chart;
let weatherData;

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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,windspeed_10m,relativehumidity_2m,apparent_temperature,uv_index,pressure_msl,visibility,cloudcover&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&current_weather=true&timezone=auto&temperature_unit=${units === 'imperial' ? 'fahrenheit' : 'celsius'}&windspeed_unit=${units === 'imperial' ? 'mph' : 'kmh'}`;

    try {
        const response = await fetch(url);
        weatherData = await response.json();
        displayWeatherInfo();
        updateChart('temperature');
        displayForecast();
        displayAdvancedMetrics();
    } catch (error) {
        console.error('Error fetching weather data:', error);
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
}

function updateDateTime() {
    const now = moment().format('dddd, MMMM Do YYYY, HH:mm:ss');
    dateTimeElement.textContent = now;
}

function getWeatherIcon(weatherCode) {
    if (weatherCode < 3) return '☀️';
    if (weatherCode < 50) return '☁️';
    if (weatherCode < 70) return '🌧️';
    if (weatherCode < 80) return '❄️';
    return '⛈️';
}

function getWeatherDescription(weatherCode) {
    if (weatherCode < 3) return 'Clear sky';
    if (weatherCode < 50) return 'Partly cloudy';
    if (weatherCode < 70) return 'Rainy';
    if (weatherCode < 80) return 'Snowy';
    return 'Thunderstorms';
}

function updateChart(dataType) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    const hourlyData = weatherData.hourly[dataType === 'temperature' ? 'temperature_2m' : 
                        dataType === 'precipitation' ? 'precipitation_probability' : 'windspeed_10m'].slice(0, 24);
    const labels = weatherData.hourly.time.slice(0, 24).map(time => moment(time).format('HH:mm'));

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = hourlyData;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: dataType.charAt(0).toUpperCase() + dataType.slice(1),
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
                        display: false
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