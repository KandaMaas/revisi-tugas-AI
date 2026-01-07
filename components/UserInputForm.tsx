import React, { useState, useEffect } from 'react';
import { TravelPreferences, GeolocationStatus } from '../types';

interface UserInputFormProps {
  onSubmit: (preferences: TravelPreferences) => void;
  isLoading: boolean;
  onGeolocationToggle: (enabled: boolean) => void; // Renamed prop
  geolocationStatus: GeolocationStatus;
  initialGeolocationEnabled: boolean; // New prop to sync toggle state
}

export const UserInputForm: React.FC<UserInputFormProps> = ({
  onSubmit,
  isLoading,
  onGeolocationToggle,
  geolocationStatus,
  initialGeolocationEnabled,
}) => {
  const [destination, setDestination] = useState<string>('');
  const [duration, setDuration] = useState<number>(3); // Default to 3 days
  const [interests, setInterests] = useState<string>('');
  // const [travelers, setTravelers] = useState<number>(1); // Removed
  const [budget, setBudget] = useState<number>(1000); // Default budget
  const [currency, setCurrency] = useState<string>('IDR'); // Default currency changed to IDR
  const [geolocationEnabled, setGeolocationEnabledState] = useState<boolean>(initialGeolocationEnabled);

  // Sync internal state with prop for geolocation toggle
  useEffect(() => {
    setGeolocationEnabledState(initialGeolocationEnabled);
  }, [initialGeolocationEnabled]);


  const handleGeolocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setGeolocationEnabledState(isEnabled);
    onGeolocationToggle(isEnabled);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (destination && duration > 0 && interests && budget >= 0 && currency) {
      const preferences: TravelPreferences = {
        destination,
        duration,
        interests,
        // travelers, // Removed
        budget,
        currency,
        // latitude and longitude will be added by App.tsx if geolocation is enabled and successful
      };
      onSubmit(preferences);
    } else {
      alert('Harap lengkapi semua bidang yang wajib diisi.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Tujuan:
        </label>
        <input
          type="text"
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g., Tokyo, Paris, Bali"
          disabled={isLoading}
          aria-label="Tujuan perjalanan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Durasi (hari):
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="1"
            required
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isLoading}
            aria-label="Durasi perjalanan dalam hari"
          />
        </div>
        {/* Removed 'Number of Travelers' input */}
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
            Anggaran Anda:
          </label>
          <input
            type="number"
            id="budget"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value))}
            min="0"
            required
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isLoading}
            aria-label="Anggaran perjalanan"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 'Budget Anda' moved up */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Mata Uang:
          </label>
          <input
            type="text"
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., IDR, USD, EUR" // Updated placeholder
            disabled={isLoading}
            aria-label="Mata uang anggaran"
          />
        </div>
      </div>

      <div>
        <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
          Minat (misalnya, budaya, makanan, petualangan, relaksasi):
        </label>
        <textarea
          id="interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          rows={3}
          required
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ceritakan apa yang ingin Anda lakukan dalam perjalanan Anda!"
          disabled={isLoading}
          aria-label="Minat perjalanan"
        ></textarea>
      </div>

      {/* Geolocation Toggle and Status */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md border border-gray-200">
        <input
          type="checkbox"
          id="geolocationEnabled"
          checked={geolocationEnabled}
          onChange={handleGeolocationChange}
          disabled={isLoading}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          aria-label="Aktifkan geolokasi"
        />
        <label htmlFor="geolocationEnabled" className="text-sm font-medium text-gray-700 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Gunakan lokasi saya saat ini (untuk rekomendasi yang relevan)
        </label>
      </div>
      {geolocationEnabled && (
        <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-100 rounded-md border border-gray-200">
          {geolocationStatus.isGettingLocation ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Mencari lokasi Anda...</span>
            </div>
          ) : geolocationStatus.error ? (
            <p className="text-red-600">
              <span className="font-semibold">Error Lokasi:</span> {geolocationStatus.error}
            </p>
          ) : (geolocationStatus.latitude !== null && geolocationStatus.longitude !== null) ? (
            <p className="text-green-600">
              Lokasi ditemukan: Lat <span className="font-semibold">{geolocationStatus.latitude.toFixed(4)}</span>, Long{' '}
              <span className="font-semibold">{geolocationStatus.longitude.toFixed(4)}</span>
            </p>
          ) : (
            <p className="text-yellow-600">Lokasi belum tersedia.</p>
          )}
        </div>
      )}


      <button
        type="submit"
        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
        disabled={isLoading}
        aria-label={isLoading ? 'Sedang membuat itinerary' : 'Buat Itinerary'}
      >
        {isLoading ? 'Sedang Membuat Itinerary...' : 'Buat Itinerary'}
      </button>
    </form>
  );
};