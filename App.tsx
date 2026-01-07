import React, { useState, useCallback, useEffect } from 'react';
import { UserInputForm } from './components/UserInputForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { TravelPreferences, GeneratedItinerary, ItineraryResult, GeolocationStatus } from './types'; // Updated types
import { generateItinerary } from './services/geminiService'; // Renamed service function

const App: React.FC = () => {
  const [itineraryResult, setItineraryResult] = useState<ItineraryResult | null>(null); // State for structured result
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geolocationEnabled, setGeolocationEnabled] = useState<boolean>(false);

  // State to hold user's initial budget for passing to ItineraryDisplay
  const [initialUserBudget, setInitialUserBudget] = useState<number>(0);
  const [initialUserCurrency, setInitialUserCurrency] = useState<string>('');


  // Function to request geolocation
  const requestGeolocation = useCallback(() => {
    if (!geolocationEnabled) {
      setCurrentLatitude(null);
      setCurrentLongitude(null);
      setLocationError(null);
      setIsGettingLocation(false);
      return;
    }

    if (navigator.geolocation) {
      setIsGettingLocation(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLatitude(position.coords.latitude);
          setCurrentLongitude(position.coords.longitude);
          setIsGettingLocation(false);
          setLocationError(null);
        },
        (geoError) => {
          console.error("Geolocation error:", geoError);
          let errorMessage = "Tidak dapat mengambil lokasi Anda.";
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage = "Akses lokasi ditolak. Harap aktifkan layanan lokasi di pengaturan browser Anda.";
              break;
            case geoError.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia.";
              break;
            case geoError.TIMEOUT:
              errorMessage = "Permintaan untuk mendapatkan lokasi pengguna telah berakhir.";
              break;
          }
          setLocationError(errorMessage);
          setIsGettingLocation(false);
          setCurrentLatitude(null); // Clear coordinates on error
          setCurrentLongitude(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation tidak didukung oleh browser Anda.");
      setCurrentLatitude(null);
      setCurrentLongitude(null);
      setIsGettingLocation(false);
    }
  }, [geolocationEnabled]);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);


  const handleSubmit = useCallback(
    async (preferences: TravelPreferences) => { // Updated signature
      setIsLoading(true);
      setError(null);
      setItineraryResult(null); // Clear previous itinerary
      setInitialUserBudget(preferences.budget); // Store the user's initial budget
      setInitialUserCurrency(preferences.currency); // Store the user's initial currency

      try {
        const fullPreferences: TravelPreferences = { ...preferences };
        if (geolocationEnabled && currentLatitude && currentLongitude && !locationError) {
          fullPreferences.latitude = currentLatitude;
          fullPreferences.longitude = currentLongitude;
        }

        const result: ItineraryResult = await generateItinerary(fullPreferences);
        setItineraryResult(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [geolocationEnabled, currentLatitude, currentLongitude, locationError]
  );

  const geolocationStatus: GeolocationStatus = {
    latitude: currentLatitude,
    longitude: currentLongitude,
    isGettingLocation: isGettingLocation,
    error: locationError,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
          🗺️ Travel Planner AI
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Asisten pribadi Anda untuk merencanakan petualangan perjalanan yang sempurna.
        </p>
      </header>

      <main className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="mb-8">
          <UserInputForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onGeolocationToggle={setGeolocationEnabled} // Changed prop name
            geolocationStatus={geolocationStatus}
            initialGeolocationEnabled={geolocationEnabled} // Pass initial state to form
          />
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LoadingSpinner />
            <p className="ml-4 mt-4 text-lg text-indigo-700">Merancang itinerary impian Anda...</p>
            <p className="mt-2 text-sm text-gray-500">Ini mungkin memakan waktu sebentar saat saya mengumpulkan data real-time.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {itineraryResult && !isLoading && (
          <ItineraryDisplay
            itineraryData={itineraryResult.itineraryData}
            sourceUrls={itineraryResult.sourceUrls}
            userBudget={initialUserBudget} // Pass the user's initial budget
            userCurrency={initialUserCurrency} // Pass the user's initial currency
          />
        )}
      </main>
      <footer className="text-center text-gray-500 mt-12 text-sm">
        <p>&copy; {new Date().getFullYear()} Travel Planner AI. Semua Hak Dilindungi.</p>
        <p className="mt-2">
          Didukung oleh{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            Gemini API
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;