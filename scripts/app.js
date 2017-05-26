// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCurrencies: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    itemTemplate: document.querySelector('.itemTemplate.currency-rate'),
    currencyExchangeRatesTemplate: document.querySelector('.cardTemplate.currency-exchange-rates'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCurrency').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCurrencyToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    if (!app.selectedCurrencies) {
      app.selectedCurrencies = [];
    }
    app.getCurrencyRates(key);
    app.selectedCurrencies.push({key: key});
    app.saveSelectedCurrencies();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    var sunrise = data.channel.astronomy.sunrise;
    var sunset = data.channel.astronomy.sunset;
    var current = data.channel.item.condition;
    var humidity = data.channel.atmosphere.humidity;
    var wind = data.channel.wind;

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.description').textContent = current.text;
    card.querySelector('.date').textContent = current.date;
    card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
    card.querySelector('.current .temperature .value').textContent =
      Math.round(current.temp);
    card.querySelector('.current .sunrise').textContent = sunrise;
    card.querySelector('.current .sunset').textContent = sunset;
    card.querySelector('.current .humidity').textContent =
      Math.round(humidity) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(wind.speed);
    card.querySelector('.current .wind .direction').textContent = wind.direction;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.channel.item.forecast[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.high);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.low);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.updateCurrencyExchangeRatesCard = function(data) {
    var dataLastUpdated = new Date(data.date);
    var card = app.visibleCards[data.base];
    if (!card) {
      card = app.currencyExchangeRatesTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');

      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.base] = card;
    }
    card.querySelector('.base').textContent = data.base;

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.date');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    card.querySelector('.date').textContent = dataLastUpdated;

    var itemTemplate, rate;
    card.querySelector('.rates').textContent = "";
    // create records in the rates section
    for (var currency in data.rates) {
      if (data.rates.hasOwnProperty(currency)) {
        rate = data.rates[currency];
        itemTemplate = app.itemTemplate.cloneNode(true)
        itemTemplate.classList.remove('itemTemplate');

        itemTemplate.querySelector('.currency').textContent = currency;
        itemTemplate.querySelector('.exchangeRate').textContent = rate;

        itemTemplate.removeAttribute('hidden');
        card.querySelector('.rates').appendChild(itemTemplate);
      }
    }

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(key, label) {
    var statement = 'select * from weather.forecast where woeid=' + key;
    var url = 'https://query.yahooapis.com/v1/public/yql?format=json&q=' +
        statement;
    // TODO add cache logic here

    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response.query.results;
          results.key = key;
          results.label = label;
          results.created = response.query.created;
          app.updateForecastCard(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateForecastCard(initialWeatherForecast);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // makes a request to the api
  app.getCurrencyRates = function(key) {
    var url = "http://api.fixer.io/latest?base=" + key;
    // TODO add cache logic here

    // fetch the latest data
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          // results.base = key;
          // results.date = response.query.date;
          // results.rates = response.query.rates;
          app.updateCurrencyExchangeRatesCard(response);
        }
      } else {
        // Return the initial currency rates as no data is available.
        app.updateCurrencyExchangeRatesCard(initialCurrenciesRates);
      }
    };
    request.open('GET', url);
    request.send();
  }

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // Saves selected currencies to the localStorage
  app.saveSelectedCurrencies = function() {
    var selectedCurrencies = JSON.stringify(app.selectedCurrencies);
    localStorage.selectedCurrencies = selectedCurrencies;
  }

  app.getIconClass = function(weatherCode) {
    // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      case 25: // cold
      case 32: // sunny
      case 33: // fair (night)
      case 34: // fair (day)
      case 36: // hot
      case 3200: // not available
        return 'clear-day';
      case 0: // tornado
      case 1: // tropical storm
      case 2: // hurricane
      case 6: // mixed rain and sleet
      case 8: // freezing drizzle
      case 9: // drizzle
      case 10: // freezing rain
      case 11: // showers
      case 12: // showers
      case 17: // hail
      case 35: // mixed rain and hail
      case 40: // scattered showers
        return 'rain';
      case 3: // severe thunderstorms
      case 4: // thunderstorms
      case 37: // isolated thunderstorms
      case 38: // scattered thunderstorms
      case 39: // scattered thunderstorms (not a typo)
      case 45: // thundershowers
      case 47: // isolated thundershowers
        return 'thunderstorms';
      case 5: // mixed rain and snow
      case 7: // mixed snow and sleet
      case 13: // snow flurries
      case 14: // light snow showers
      case 16: // snow
      case 18: // sleet
      case 41: // heavy snow
      case 42: // scattered snow showers
      case 43: // heavy snow
      case 46: // snow showers
        return 'snow';
      case 15: // blowing snow
      case 19: // dust
      case 20: // foggy
      case 21: // haze
      case 22: // smoky
        return 'fog';
      case 24: // windy
      case 23: // blustery
        return 'windy';
      case 26: // cloudy
      case 27: // mostly cloudy (night)
      case 28: // mostly cloudy (day)
      case 31: // clear (night)
        return 'cloudy';
      case 29: // partly cloudy (night)
      case 30: // partly cloudy (day)
      case 44: // partly cloudy
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherForecast = {
    key: '2459115',
    label: 'New York, NY',
    created: '2016-07-22T01:00:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Windy",
          date: "Thu, 21 Jul 2016 09:00 PM EDT",
          temp: 56,
          code: 24
        },
        forecast: [
          {code: 44, high: 86, low: 70},
          {code: 44, high: 94, low: 73},
          {code: 4, high: 95, low: 78},
          {code: 24, high: 75, low: 89},
          {code: 24, high: 89, low: 77},
          {code: 44, high: 92, low: 79},
          {code: 44, high: 89, low: 77}
        ]
      },
      atmosphere: {
        humidity: 56
      },
      wind: {
        speed: 25,
        direction: 195
      }
    }
  };

  var initialCurrenciesRates = {
    "base": "USD",
    "date": "2017-05-19",
    "rates": {
        "AUD": 1.3446,
        "BGN": 1.7495,
        "BRL": 3.3301,
        "CAD": 1.3569,
        "CHF": 0.97692,
        "CNY": 6.8893,
        "CZK": 23.708,
        "DKK": 6.6563,
        "GBP": 0.76848,
        "HKD": 7.7824,
        "HRK": 6.6544,
        "HUF": 276.95,
        "IDR": 13312,
        "ILS": 3.5859,
        "INR": 64.587,
        "JPY": 111.24,
        "KRW": 1119.5,
        "MXN": 18.73,
        "MYR": 4.3215,
        "NOK": 8.4017,
        "NZD": 1.4516,
        "PHP": 49.704,
        "PLN": 3.7575,
        "RON": 4.0793,
        "RUB": 57.054,
        "SEK": 8.7569,
        "SGD": 1.3873,
        "THB": 34.37,
        "TRY": 3.6027,
        "ZAR": 13.263,
        "EUR": 0.89453
    }
  };

  // Code required to start the app
  app.selectedCurrencies = localStorage.selectedCurrencies;
  if (app.selectedCurrencies) {
    app.selectedCurrencies = JSON.parse(app.selectedCurrencies);
    app.selectedCurrencies.forEach(function(currency) {
      app.getCurrencyRates(currency.key);
    });
  } else {
    // the user uses this app for the first time
    // show fake data
    app.updateCurrencyExchangeRatesCard(initialCurrenciesRates);
    app.selectedCurrencies = [
      {key: initialCurrenciesRates.base}
    ];
    app.saveSelectedCurrencies();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./scripts/service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
