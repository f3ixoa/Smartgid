import "./Locations.css"
import Footer from "../components/Footer.jsx"
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch, FiMapPin, FiMap, FiCheck, FiX } from "react-icons/fi"
import { FaBookmark, FaRegBookmark } from "react-icons/fa"
import { GoChevronDown, GoChevronUp } from "react-icons/go"
import {
  HOTELS,
  CITIES,
  AMENITIES,
  FILTER_AMENITIES,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
} from "../data/hotelsData.js"

const API_KEY_WEATHER_AKTAU = "ac62d9a471bd165c9df8f6d3b692b310";

/* ========================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
======================================== */

// Склонение: plural(5, ['гость', 'гостя', 'гостей'])
const plural = (n, [one, few, many]) => {
  const n10 = n % 10
  const n100 = n % 100

  if (n10 === 1 && n100 !== 11) return one
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few
  return many
}

const formatPrice = (value) => value.toLocaleString('ru-RU')

const todayISO = () => new Date().toLocaleDateString('en-CA')

const addDays = (iso, days) => {
  const date = new Date(iso + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-CA')
}

const countNights = (from, to) =>
  Math.round(
    (new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000
  )

// Пересекаются ли выбранные даты с периодами, когда отель занят
const isBooked = (hotel, checkIn, checkOut) =>
  hotel.unavailable.some(
    (range) => range.from < checkOut && range.to > checkIn
  )

const SORTS = [
  { id: 'popular', label: 'По популярности' },
  { id: 'price-asc', label: 'Сначала дешевле' },
  { id: 'price-desc', label: 'Сначала дороже' },
  { id: 'rating', label: 'По рейтингу' },
]

const RATING_OPTIONS = [4.5, 4.0]

function Locations(){
    /* ========================================
       ПОГОДА
    ======================================== */
    const [weather, setWeather] = useState(null)
    const [weatherLoading, setWeatherLoading] = useState(true)

    useEffect(() => {
      const fetchWeather = async () => {
        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=43.65&lon=51.17&units=metric&lang=ru&appid=${API_KEY_WEATHER_AKTAU}`
          )

          if (!response.ok) {
            throw new Error('Не удалось загрузить погоду')
          }

          const data = await response.json()

          setWeather({
            city: data.name,
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
          })
        } catch (error) {
          console.error('Weather error:', error)
        } finally {
          setWeatherLoading(false)
        }
      }

      fetchWeather()
    }, [])

    /* ========================================
       ПОЛЯ ПОИСКОВИКА (то, что пользователь вводит)
    ======================================== */
    const [query, setQuery] = useState('')

    const [selectedCity, setSelectedCity] = useState('Актау')
    const [cityOpen, setCityOpen] = useState(false)

    const [datesOpen, setDatesOpen] = useState(false)
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')

    const [adults, setAdults] = useState(2)
    const [children, setChildren] = useState(0)
    const [rooms, setRooms] = useState(1)
    const [guestsOpen, setGuestsOpen] = useState(false)

    const [searchMessage, setSearchMessage] = useState('')

    /* ========================================
       ПРИМЕНЁННЫЙ ПОИСК
       Обновляется только по кнопке «Найти отель» / Enter.
       Именно по нему считается список отелей.
    ======================================== */
    const [applied, setApplied] = useState({
      query: '',
      city: 'Актау',
      checkIn: '',
      checkOut: '',
      guests: 2,
      rooms: 1,
    })

    /* ========================================
       ФИЛЬТРЫ (работают сразу, без кнопки)
    ======================================== */
    const [priceMin, setPriceMin] = useState(PRICE_MIN)
    const [priceMax, setPriceMax] = useState(PRICE_MAX)
    const [minRating, setMinRating] = useState(0)
    const [amenities, setAmenities] = useState([])
    const [filtersOpen, setFiltersOpen] = useState(false) // на мобильных

    /* ========================================
       СОРТИРОВКА, ИЗБРАННОЕ, БРОНИРОВАНИЕ
    ======================================== */
    const [sort, setSort] = useState('popular')
    const [sortOpen, setSortOpen] = useState(false)
    const [favorites, setFavorites] = useState([])
    const [bookingHotel, setBookingHotel] = useState(null)
    const [bookingDone, setBookingDone] = useState(false)

    const searchRef = useRef(null)
    const sortRef = useRef(null)

    // Закрываем выпадающие списки по клику вне их
    useEffect(() => {
      const handleOutside = (event) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
          setCityOpen(false)
          setDatesOpen(false)
          setGuestsOpen(false)
        }

        if (sortRef.current && !sortRef.current.contains(event.target)) {
          setSortOpen(false)
        }
      }

      document.addEventListener('mousedown', handleOutside)
      return () => document.removeEventListener('mousedown', handleOutside)
    }, [])

    // Закрываем модалку по Escape
    useEffect(() => {
      if (!bookingHotel) return

      const handleKey = (event) => {
        if (event.key === 'Escape') closeBooking()
      }

      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }, [bookingHotel])

    /* ========================================
       ФОРМАТИРОВАНИЕ
    ======================================== */
    const formatDate = (date) => {
      if (!date) return ''

      return new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })
    }

    const totalGuests = adults + children
    const guestsLabel = `${totalGuests} ${plural(totalGuests, ['гость', 'гостя', 'гостей'])} · ${rooms} ${plural(rooms, ['номер', 'номера', 'номеров'])}`

    /* ========================================
       ДЕЙСТВИЯ ПОИСКОВИКА
    ======================================== */
    const closeAllDropdowns = () => {
      setCityOpen(false)
      setDatesOpen(false)
      setGuestsOpen(false)
    }

    const handleSearch = () => {
      setApplied({
        query,
        city: selectedCity,
        checkIn,
        checkOut,
        guests: totalGuests,
        rooms,
      })

      closeAllDropdowns()

      setSearchMessage(
        !checkIn || !checkOut
          ? 'Укажите даты заезда и выезда, чтобы увидеть итоговую цену и свободные отели'
          : ''
      )
    }

    const changeAdults = (value) => {
      setAdults(value)
      // номеров не может быть больше, чем взрослых
      if (rooms > value) setRooms(value)
    }

    /* ========================================
       ДЕЙСТВИЯ ФИЛЬТРОВ
    ======================================== */
    const toggleAmenity = (key) => {
      setAmenities((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
      )
    }

    const toggleRating = (value) => {
      setMinRating((prev) => (prev === value ? 0 : value))
    }

    const handleMinChange = (value) => {
      setPriceMin(Number(value) || 0)
    }

    const handleMaxChange = (value) => {
      setPriceMax(Number(value) || 0)
    }

    // После ввода вручную приводим значения к допустимым
    const normalizePrice = () => {
      let min = Math.min(Math.max(priceMin, PRICE_MIN), PRICE_MAX)
      let max = Math.min(Math.max(priceMax, PRICE_MIN), PRICE_MAX)

      if (min > max) [min, max] = [max, min]

      setPriceMin(min)
      setPriceMax(max)
    }

    const resetFilters = () => {
      setPriceMin(PRICE_MIN)
      setPriceMax(PRICE_MAX)
      setMinRating(0)
      setAmenities([])
    }

    const priceChanged = priceMin !== PRICE_MIN || priceMax !== PRICE_MAX
    const activeFiltersCount =
      (priceChanged ? 1 : 0) + (minRating ? 1 : 0) + amenities.length

    /* ========================================
       РЕЗУЛЬТАТЫ: поиск + фильтры + сортировка
    ======================================== */
    const hasDates = Boolean(applied.checkIn && applied.checkOut)
    const nights = hasDates ? countNights(applied.checkIn, applied.checkOut) : 0

    const results = useMemo(() => {
      const text = applied.query.trim().toLowerCase()
      const guestsPerRoom = Math.ceil(applied.guests / applied.rooms)

      const list = HOTELS.filter((hotel) => {
        // --- параметры из поисковика ---
        if (hotel.city !== applied.city) return false

        if (
          text &&
          !hotel.name.toLowerCase().includes(text) &&
          !hotel.district.toLowerCase().includes(text)
        ) {
          return false
        }

        if (guestsPerRoom > hotel.maxGuestsPerRoom) return false
        if (applied.rooms > hotel.roomsLeft) return false

        if (
          applied.checkIn &&
          applied.checkOut &&
          isBooked(hotel, applied.checkIn, applied.checkOut)
        ) {
          return false
        }

        // --- боковые фильтры ---
        if (hotel.price < priceMin || hotel.price > priceMax) return false
        if (minRating && hotel.rating < minRating) return false

        if (!amenities.every((key) => hotel.amenities.includes(key))) {
          return false
        }

        return true
      })

      const sorted = [...list]

      if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
      if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
      if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
      if (sort === 'popular') sorted.sort((a, b) => b.reviews - a.reviews)

      return sorted
    }, [applied, priceMin, priceMax, minRating, amenities, sort])

    const cityPrep =
      CITIES.find((city) => city.name === applied.city)?.prep ?? applied.city

    const subtitleParts = [
      `${results.length} ${plural(results.length, ['отель', 'отеля', 'отелей'])}`,
    ]

    if (hasDates) {
      subtitleParts.push(
        `${formatDate(applied.checkIn)} — ${formatDate(applied.checkOut)} · ${nights} ${plural(nights, ['ночь', 'ночи', 'ночей'])}`
      )
    }

    subtitleParts.push(
      `${applied.guests} ${plural(applied.guests, ['гость', 'гостя', 'гостей'])}, ${applied.rooms} ${plural(applied.rooms, ['номер', 'номера', 'номеров'])}`
    )

    /* ========================================
       ИЗБРАННОЕ И БРОНЬ
    ======================================== */
    const toggleFavorite = (id) => {
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }

    const openBooking = (hotel) => {
      if (!hasDates) {
        // Для брони нужны даты — подсказываем и открываем календарь
        setSearchMessage('Выберите даты заезда и выезда и нажмите «Найти отель», чтобы забронировать')
        setDatesOpen(true)
        searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }

      setBookingDone(false)
      setBookingHotel(hotel)
    }

    function closeBooking() {
      setBookingHotel(null)
      setBookingDone(false)
    }

    const confirmBooking = () => {
      // Здесь будет запрос к бэкенду, например:
      // await fetch('/api/bookings', { method: 'POST', body: JSON.stringify({...}) })
      setBookingDone(true)
    }

    const handleShowOnMap = () => {
      // Подключите навигацию на страницу карты, например:
      // navigate(`/map?city=${applied.city}`)
      console.log('Показать на карте:', results.map((hotel) => hotel.id))
    }

    const bookingTotal = bookingHotel
      ? bookingHotel.price * nights * applied.rooms
      : 0

    /* ========================================
       РАЗМЕТКА
    ======================================== */
    return(
        <>
        <main className="locations-page">

        <section className="locations-hero">
            <div className="locations-container">

            {/* Хлебные крошки */}
            <div className="locations-breadcrumbs">
                <span>Главная</span>
                <span>/</span>
                <span>Мангистау</span>
                <span>/</span>
                <span>Места</span>
            </div>

            {/* Заголовок и погода */}
            <div className="locations-hero-content">

                <div className="locations-heading">
                <h1>Ваш Мангистау</h1>

                <p>
                    Где остановиться, что попробовать и куда отправиться
                </p>
                </div>

                <div className="locations-weather">

                <div className="weather-icon">
                    {weather ? (
                    <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        alt={weather.description}
                    />
                    ) : (
                    <span>☀</span>
                    )}
                </div>

                <div className="weather-info">
                    <span>Актау, Мангистау</span>

                    {weatherLoading ? (
                    <span>Загрузка погоды...</span>
                    ) : weather ? (
                    <span>
                        Сегодня · {weather.temperature}°C · {weather.description}
                    </span>
                    ) : (
                    <span>Погода временно недоступна</span>
                    )}
                </div>

                </div>
            </div>

            {/* Категории */}
            <div className="locations-tabs">

                <button className="locations-tab active">
                <span>▤</span>
                Отели
                </button>

                <button className="locations-tab">
                <span>♨</span>
                Где поесть
                </button>

                <button className="locations-tab">
                <span>♧</span>
                Куда сходить
                </button>

            </div>

            </div>
        </section>

        {/* ========== ПОИСКОВИК ========== */}
        <section className="locations-search-section">
        <div className="locations-search" ref={searchRef}>

        {/* Поиск по названию */}
        <div className="locations-search-input">
          <FiSearch className="search-main-icon" />

          <input
            type="text"
            placeholder="Название отеля или район"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
          />
        </div>

        {/* Город */}
        <div className="city-selector">
          <button
            className="search-location"
            onClick={() => {
              setCityOpen(!cityOpen)
              setDatesOpen(false)
              setGuestsOpen(false)
            }}
          >
            <span>{selectedCity}</span>
            <span>{cityOpen ? <GoChevronUp/> : <GoChevronDown/>}</span>
          </button>

          {cityOpen && (
            <div className="city-dropdown">
              <div className="city-dropdown-title">
                Города Мангистау
              </div>

              {CITIES.map((city) => (
                <button
                  key={city.name}
                  className={`city-option ${
                    selectedCity === city.name ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedCity(city.name)
                    setCityOpen(false)
                  }}
                >
                  <span>{city.name}</span>

                  {selectedCity === city.name && (
                    <span className="city-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Выбор дат */}
        <div className="search-date-picker">

          <button
            className="date-picker-trigger"
            onClick={() => {
              setDatesOpen(!datesOpen)
              setCityOpen(false)
              setGuestsOpen(false)
            }}
          >
            <span>
              {checkIn && checkOut
                ? `${formatDate(checkIn)} — ${formatDate(checkOut)}`
                : checkIn
                  ? `${formatDate(checkIn)} — Выезд`
                  : 'Заезд — Выезд'}
            </span>

            <span>{datesOpen ? <GoChevronUp/> : <GoChevronDown/>}</span>
          </button>

          {datesOpen && (
            <div className="date-picker-dropdown">

              <label>
                Заезд
                <input
                  type="date"
                  value={checkIn}
                  min={todayISO()}
                  onChange={(e) => {
                    const value = e.target.value
                    setCheckIn(value)

                    if (checkOut && value >= checkOut) {
                      setCheckOut('')
                    }
                  }}
                />
              </label>

              <label>
                Выезд
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn ? addDays(checkIn, 1) : todayISO()}
                  disabled={!checkIn}
                  onChange={(e) => {
                    setCheckOut(e.target.value)
                    if (e.target.value) setDatesOpen(false)
                  }}
                />
              </label>

            </div>
          )}

        </div>

        {/* Выбор гостей и номеров */}
        <div className="guests-selector">

          <button
            className="guests-trigger"
            onClick={() => {
              setGuestsOpen(!guestsOpen)
              setCityOpen(false)
              setDatesOpen(false)
            }}
          >
            <span>{guestsLabel}</span>

            <span>{guestsOpen ? <GoChevronUp/> : <GoChevronDown/>}</span>
          </button>

          {guestsOpen && (
            <div className="guests-dropdown">

              <div className="guest-row">
                <div>
                  <strong>Взрослые</strong>
                  <small>От 18 лет</small>
                </div>

                <div className="guest-counter">
                  <button
                    disabled={adults <= 1}
                    onClick={() => changeAdults(adults - 1)}
                  >
                    −
                  </button>

                  <span>{adults}</span>

                  <button
                    disabled={adults >= 10}
                    onClick={() => changeAdults(adults + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="guest-row">
                <div>
                  <strong>Дети</strong>
                  <small>До 17 лет</small>
                </div>

                <div className="guest-counter">
                  <button
                    disabled={children <= 0}
                    onClick={() => setChildren(children - 1)}
                  >
                    −
                  </button>

                  <span>{children}</span>

                  <button
                    disabled={children >= 8}
                    onClick={() => setChildren(children + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="guest-row">
                <div>
                  <strong>Номера</strong>
                  <small>Количество комнат</small>
                </div>

                <div className="guest-counter">
                  <button
                    disabled={rooms <= 1}
                    onClick={() => setRooms(rooms - 1)}
                  >
                    −
                  </button>

                  <span>{rooms}</span>

                  <button
                    disabled={rooms >= adults || rooms >= 5}
                    onClick={() => setRooms(rooms + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                className="guests-done"
                onClick={() => setGuestsOpen(false)}
              >
                Готово
              </button>

            </div>
          )}
        </div>

        {/* Кнопка поиска */}
        <button
          className="locations-search-submit"
          onClick={handleSearch}
        >
          Найти отель
        </button>

        </div>

        {searchMessage && (
          <p className="search-message">{searchMessage}</p>
        )}
        </section>

        {/* ========== ФИЛЬТРЫ + ОТЕЛИ ========== */}
        <div className="locations-layout">

          {/* ---------- Боковая фильтрация ---------- */}
          <aside className="filters">

            <button
              className="filters-toggle"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span>
                Фильтры{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
              </span>
              {filtersOpen ? <GoChevronUp/> : <GoChevronDown/>}
            </button>

            <div className={`filters-panel ${filtersOpen ? 'open' : ''}`}>

              <div className="filters-head">
                <h2>Фильтры</h2>

                <button
                  className="filters-reset"
                  onClick={resetFilters}
                  disabled={activeFiltersCount === 0}
                >
                  Сбросить
                </button>
              </div>

              {/* Бюджет */}
              <div className="filter-group">
                <h3>Бюджет за ночь</h3>

                <div className="price-fields">
                  <label className="price-field">
                    <span>от</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={priceMin}
                      onChange={(e) => handleMinChange(e.target.value)}
                      onBlur={normalizePrice}
                    />
                    <span>₸</span>
                  </label>

                  <label className="price-field">
                    <span>до</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={priceMax}
                      onChange={(e) => handleMaxChange(e.target.value)}
                      onBlur={normalizePrice}
                    />
                    <span>₸</span>
                  </label>
                </div>

                <div className="price-slider">
                  <div className="price-slider-track">
                    <div
                      className="price-slider-fill"
                      style={{
                        left: `${((priceMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                        right: `${100 - ((priceMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                      }}
                    />
                  </div>

                  <input
                    type="range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={priceMin}
                    aria-label="Минимальная цена"
                    onChange={(e) =>
                      setPriceMin(Math.min(Number(e.target.value), priceMax - PRICE_STEP))
                    }
                  />

                  <input
                    type="range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={priceMax}
                    aria-label="Максимальная цена"
                    onChange={(e) =>
                      setPriceMax(Math.max(Number(e.target.value), priceMin + PRICE_STEP))
                    }
                  />
                </div>
              </div>

              {/* Оценка гостей */}
              <div className="filter-group">
                <h3>Оценка гостей</h3>

                {RATING_OPTIONS.map((value) => (
                  <label className="filter-check" key={value}>
                    <input
                      type="checkbox"
                      checked={minRating === value}
                      onChange={() => toggleRating(value)}
                    />
                    <span className="filter-check-box"><FiCheck /></span>
                    <span>{value.toFixed(1)} и выше</span>
                  </label>
                ))}
              </div>

              {/* Удобства */}
              <div className="filter-group">
                <h3>Удобства</h3>

                {FILTER_AMENITIES.map((key) => (
                  <label className="filter-check" key={key}>
                    <input
                      type="checkbox"
                      checked={amenities.includes(key)}
                      onChange={() => toggleAmenity(key)}
                    />
                    <span className="filter-check-box"><FiCheck /></span>
                    <span>{AMENITIES[key].label}</span>
                  </label>
                ))}
              </div>

              <button className="filters-map" onClick={handleShowOnMap}>
                <FiMap />
                Показать на карте
              </button>

            </div>
          </aside>

          {/* ---------- Список отелей ---------- */}
          <section className="hotels">

            <div className="hotels-head">
              <div>
                <h2>
                  {applied.query.trim()
                    ? `Отели в ${cityPrep} по запросу «${applied.query.trim()}»`
                    : `Рекомендуем в ${cityPrep}`}
                </h2>
                <p>{subtitleParts.join(' · ')}</p>
              </div>

              <div className="sort" ref={sortRef}>
                <button
                  className="sort-trigger"
                  onClick={() => setSortOpen(!sortOpen)}
                >
                  {SORTS.find((item) => item.id === sort).label}
                  {sortOpen ? <GoChevronUp/> : <GoChevronDown/>}
                </button>

                {sortOpen && (
                  <div className="sort-dropdown">
                    {SORTS.map((item) => (
                      <button
                        key={item.id}
                        className={`city-option ${sort === item.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSort(item.id)
                          setSortOpen(false)
                        }}
                      >
                        <span>{item.label}</span>
                        {sort === item.id && <span className="city-check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="hotels-empty">
                <h3>Ничего не нашли</h3>
                <p>
                  Попробуйте изменить запрос, даты, количество гостей или
                  ослабить фильтры.
                </p>

                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters}>Сбросить фильтры</button>
                )}
              </div>
            ) : (
              <div className="hotels-list">
                {results.map((hotel) => {
                  const saved = favorites.includes(hotel.id)
                  const total = hasDates
                    ? hotel.price * nights * applied.rooms
                    : 0

                  return (
                    <article className="hotel-card" key={hotel.id}>

                      <div className="hotel-card-photo">
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />

                        {hotel.badge && (
                          <span className="hotel-badge">{hotel.badge}</span>
                        )}
                      </div>

                      <div className="hotel-card-body">

                        <div className="hotel-card-top">
                          <h3>{hotel.name}</h3>

                          <button
                            className={`hotel-fav ${saved ? 'active' : ''}`}
                            aria-label={saved ? 'Убрать из избранного' : 'Добавить в избранное'}
                            onClick={() => toggleFavorite(hotel.id)}
                          >
                            {saved ? <FaBookmark /> : <FaRegBookmark />}
                          </button>
                        </div>

                        <div className="hotel-rating">
                          <span className="hotel-rating-score">★ {hotel.rating.toFixed(1)}</span>
                          <span>
                            · {formatPrice(hotel.reviews)} {plural(hotel.reviews, ['отзыв', 'отзыва', 'отзывов'])}
                          </span>
                        </div>

                        <div className="hotel-location">
                          <FiMapPin />
                          <span>{hotel.location}</span>
                        </div>

                        <div className="hotel-amenities">
                          {hotel.amenities
                            .slice(0, 3)
                            .map((key) => AMENITIES[key].short)
                            .join(' · ')}
                        </div>

                        <div className="hotel-card-bottom">
                          <div className="hotel-price">
                            <small>За номер · 1 ночь</small>
                            <strong>от {formatPrice(hotel.price)} ₸ / ночь</strong>

                            {hasDates && (
                              <span className="hotel-total">
                                {nights} {plural(nights, ['ночь', 'ночи', 'ночей'])}
                                {applied.rooms > 1 ? `, ${applied.rooms} ${plural(applied.rooms, ['номер', 'номера', 'номеров'])}` : ''}
                                {' '}· итого {formatPrice(total)} ₸
                              </span>
                            )}
                          </div>

                          <button
                            className="hotel-book"
                            onClick={() => openBooking(hotel)}
                          >
                            Забронировать
                          </button>
                        </div>

                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <p className="hotels-note">
              Цены указаны за ночь. Итоговая стоимость зависит от выбранных дат.
            </p>

          </section>
        </div>

        </main>

        {/* ========== МОДАЛКА БРОНИ ========== */}
        {bookingHotel && (
          <div className="booking-overlay" onClick={closeBooking}>
            <div
              className="booking-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="booking-close"
                aria-label="Закрыть"
                onClick={closeBooking}
              >
                <FiX />
              </button>

              {bookingDone ? (
                <div className="booking-done">
                  <div className="booking-done-icon"><FiCheck /></div>
                  <h3>Заявка отправлена</h3>
                  <p>
                    {bookingHotel.name}, {formatDate(applied.checkIn)} — {formatDate(applied.checkOut)}.
                    Подтверждение придёт на вашу почту.
                  </p>
                  <button className="booking-confirm" onClick={closeBooking}>
                    Отлично
                  </button>
                </div>
              ) : (
                <>
                  <h3>Бронирование</h3>
                  <p className="booking-hotel-name">{bookingHotel.name}</p>

                  <dl className="booking-summary">
                    <div>
                      <dt>Даты</dt>
                      <dd>{formatDate(applied.checkIn)} — {formatDate(applied.checkOut)}</dd>
                    </div>
                    <div>
                      <dt>Ночей</dt>
                      <dd>{nights}</dd>
                    </div>
                    <div>
                      <dt>Гости</dt>
                      <dd>
                        {applied.guests} {plural(applied.guests, ['гость', 'гостя', 'гостей'])}
                      </dd>
                    </div>
                    <div>
                      <dt>Номера</dt>
                      <dd>{applied.rooms}</dd>
                    </div>
                    <div className="booking-total">
                      <dt>Итого</dt>
                      <dd>{formatPrice(bookingTotal)} ₸</dd>
                    </div>
                  </dl>

                  <button className="booking-confirm" onClick={confirmBooking}>
                    Подтвердить бронь
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <Footer/>
        </>
    );
}


export default Locations