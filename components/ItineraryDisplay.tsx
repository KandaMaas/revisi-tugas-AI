import React from 'react';
import { GeneratedItinerary, DayItinerary, Activity } from '../types';

interface ItineraryDisplayProps {
  itineraryData: GeneratedItinerary;
  sourceUrls: { uri: string; title?: string }[];
  userBudget: number;
  userCurrency: string;
}

export const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itineraryData, sourceUrls, userBudget, userCurrency }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Your Travel Itinerary to {itineraryData.destination}
      </h2>

      {/* Overview */}
      <section className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-2xl font-semibold text-blue-700 mb-3">Overview</h3>
        <p className="text-gray-700 leading-relaxed">
          {itineraryData.overview}
        </p>
      </section>

      {/* Budget Overview */}
      <section className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h3 className="text-2xl font-semibold text-purple-700 mb-3">Budget Insights</h3>
        <p className="text-gray-700 leading-relaxed mb-2">
          Your initial budget: <span className="font-bold">{userBudget} {userCurrency}</span>.
        </p>
        {itineraryData.budgetSummary && (
          <p className="text-gray-700 leading-relaxed">
            AI analysis: {itineraryData.budgetSummary}
          </p>
        )}
      </section>

      {/* Day-by-day Itinerary */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Day-by-Day Plan</h3>
        {itineraryData.itinerary.map((dayPlan: DayItinerary) => (
          <div key={dayPlan.day} className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
            <h4 className="text-xl font-bold text-gray-800 mb-3">
              Day {dayPlan.day}: <span className="text-indigo-600">{dayPlan.theme}</span>
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              {dayPlan.activities.map((activity: Activity, index: number) => (
                <li key={index} className="text-gray-700">
                  <span className="font-medium text-gray-900">{activity.time}:</span> {activity.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Packing Suggestions */}
      <section className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-2xl font-semibold text-green-700 mb-3">Packing Suggestions</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          {itineraryData.packingSuggestions.map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Notes */}
      <section className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-2xl font-semibold text-yellow-700 mb-3">Important Notes</h3>
        <p className="text-gray-700 leading-relaxed">
          {itineraryData.notes}
        </p>
      </section>

      {/* Source URLs from Grounding */}
      {sourceUrls.length > 0 && (
        <section className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <h3 className="text-2xl font-semibold text-gray-700 mb-3">Sources & Further Reading</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            {sourceUrls.map((source, index) => (
              <li key={index}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};