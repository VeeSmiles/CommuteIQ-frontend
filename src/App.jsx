import { useState, useEffect, useCallback } from "react";
import RouteSearchForm from "./components/RouteSearchForm.jsx";
import ResultsCard from "./components/ResultsCard.jsx";
import DepartureOptions from "./components/DepartureOptions.jsx";
import MapView from "./components/MapView.jsx";
import CommunityReportForm from "./components/CommunityReportForm.jsx";
import { getModeComparison, getRecommendation, geocodeForMap, getReports } from "./api/client.js";

export default function App() {
  const [city, setCity] = useState("nairobi");
  const [options, setOptions] = useState([]);
  const [selectedMode, setSelectedMode] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [originPoint, setOriginPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // FIX 1: Store last search params so we can pass departureTime to ResultsCard
  // and re-fetch recommendation when the user switches mode.
  const [lastSearch, setLastSearch] = useState(null);

  const loadReports = useCallback(async (forCity) => {
    try {
      const data = await getReports(forCity);
      setReports(data);
    } catch (err) {
      console.error("Couldn't load community reports:", err);
    }
  }, []);

  useEffect(() => {
    loadReports(city);
  }, [city, loadReports]);

  // FIX 2: Re-fetch recommendation whenever the user picks a different mode.
  // Previously the recommendation only fetched once for comparison[0].mode
  // and never updated when the user clicked a different mode pill.
  useEffect(() => {
    if (!selectedMode || !lastSearch) return;
    getRecommendation({
      origin:      lastSearch.origin,
      destination: lastSearch.destination,
      mode:        selectedMode,
      city:        lastSearch.city,
      time:        lastSearch.time,
    })
      .then(setRecommendation)
      .catch((err) => console.error("Recommendation failed:", err));
  }, [selectedMode, lastSearch]);

  function handleCityChange(newCity) {
    setCity(newCity);
    setOptions([]);
    setSelectedMode(null);
    setOriginPoint(null);
    setDestinationPoint(null);
    setLastSearch(null);
  }

  async function handleSearch({ origin, destination, time, city: searchCity, modes }) {
    setIsLoading(true);
    setError(null);
    try {
      const [comparison, originGeo, destGeo] = await Promise.all([
        getModeComparison({ origin, destination, time, city: searchCity, modes }),
        geocodeForMap(origin, searchCity),
        geocodeForMap(destination, searchCity),
      ]);

      if (comparison.length === 0) {
        throw new Error(
          "The backend couldn't return a prediction for any mode. Check it's running and reachable."
        );
      }

      // FIX 3: Save the full search params including time
      setLastSearch({ origin, destination, time, city: searchCity });
      setOptions(comparison);
      setSelectedMode(comparison[0].mode);
      setOriginPoint(originGeo);
      setDestinationPoint(destGeo);
      // Recommendation will fire automatically via the useEffect above
    } catch (err) {
      console.error(err);
      setError(err.message);
      setOptions([]);
      setRecommendation(null);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedResult = options.find((o) => o.mode === selectedMode) ?? null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">IQ</span>
          <div>
            <h1>CommuteIQ</h1>
            <p>Community-powered commute intelligence</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="search-section">
          <RouteSearchForm
            city={city}
            onCityChange={handleCityChange}
            onSearch={handleSearch}
            isLoading={isLoading}
            options={options}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
          />
          {error && <p className="form-status error">{error}</p>}

          {/* FIX 4: Pass departureTime so ResultsCard can show arrival time */}
          <ResultsCard
            result={selectedResult}
            departureTime={lastSearch?.time ?? null}
          />

          <DepartureOptions recommendation={recommendation} />
        </section>

        <section className="map-section">
          <MapView
            city={city}
            origin={originPoint}
            destination={destinationPoint}
            routeGeometry={selectedResult?.route_geometry}
            reports={reports}
          />
          <CommunityReportForm city={city} onReportSubmitted={() => loadReports(city)} />
        </section>
      </main>

      <footer className="app-footer">
        <p>Built for the Girls in STEM Global Hackathon</p>
      </footer>
    </div>
  );
}
