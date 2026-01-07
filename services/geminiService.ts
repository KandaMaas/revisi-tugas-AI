import { GoogleGenAI, Type } from "@google/genai";
import { TravelPreferences, GeneratedItinerary, ItineraryResult } from '../types';

/**
 * Helper function to extract a valid JSON string from a potentially malformed string
 * that might include markdown fences or leading/trailing text.
 */
function extractJsonFromString(input: string): string | null {
  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');

  // Handle case where it might be an array
  const firstBracket = input.indexOf('[');
  const lastBracket = input.lastIndexOf(']');

  let jsonCandidate = null;

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonCandidate = input.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    jsonCandidate = input.substring(firstBracket, lastBracket + 1);
  }

  if (jsonCandidate) {
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch (e) {
      // Not valid JSON, try to be more forgiving by removing common markdown
      const cleanedInput = input.replace(/```json|```javascript|```/g, '').trim();
      const newFirstBrace = cleanedInput.indexOf('{');
      const newLastBrace = cleanedInput.lastIndexOf('}');
      if (newFirstBrace !== -1 && newLastBrace !== -1 && newLastBrace > newFirstBrace) {
        const finalCandidate = cleanedInput.substring(newFirstBrace, newLastBrace + 1);
        try {
          JSON.parse(finalCandidate);
          return finalCandidate;
        } catch (innerError) {
          // Still not valid
        }
      }
      const newFirstBracket = cleanedInput.indexOf('[');
      const newLastBracket = cleanedInput.lastIndexOf(']');
      if (newFirstBracket !== -1 && newLastBracket !== -1 && newLastBracket > newFirstBracket) {
        const finalCandidate = cleanedInput.substring(newFirstBracket, newLastBracket + 1);
        try {
          JSON.parse(finalCandidate);
          return finalCandidate;
        } catch (innerError) {
          // Still not valid
        }
      }
    }
  }

  return null; // No valid JSON object or array found after attempts
}

/**
 * Generates a personalized travel itinerary using the Gemini API.
 * This function is initialized within the call to ensure the latest API key is used,
 * especially relevant for models that might require `window.aistudio.openSelectKey()`.
 *
 * @param preferences User's travel preferences including destination, duration, interests, etc.
 * @returns A promise that resolves to an ItineraryResult object, including the generated itinerary and source URLs.
 */
export async function generateItinerary(
  preferences: TravelPreferences
): Promise<ItineraryResult> {
  // Initialize the Gemini API client here to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const { destination, duration, interests, budget, currency, latitude, longitude } = preferences;

  let prompt = `Generate a detailed and creative travel itinerary for a ${duration}-day trip to ${destination}.
  The travelers are interested in ${interests}. They have a budget of ${budget} ${currency}.
  
  Please include:
  - An overview of the trip.
  - A day-by-day breakdown with a theme and specific activities (with suggested times).
  - Practical packing suggestions.
  - Any important notes for the trip.
  - A summary or analysis of how the budget of ${budget} ${currency} might influence the trip planning or what it can afford.
  
  Jika relevan, sertakan saran yang berfokus pada Indonesia untuk rekomendasi umum dan penelusuran.
  
  The itinerary should be in JSON format.`;

  const tools = [];
  const toolConfig: any = {};
  let modelToUse: string;
  let useMapsGrounding = false;

  if (latitude && longitude) {
    useMapsGrounding = true;
    prompt += ` Current user location is approximately latitude ${latitude}, longitude ${longitude}.`;
    tools.push({ googleMaps: {} });
    toolConfig.retrievalConfig = {
      latLng: {
        latitude: latitude,
        longitude: longitude
      }
    };
    modelToUse = 'gemini-2.5-flash';
  } else {
    modelToUse = 'gemini-3-pro-preview';
  }
  
  tools.push({ googleSearch: {} });

  const generateContentConfig: any = {
    temperature: 0.9,
    topP: 0.95,
    topK: 64,
    tools: tools,
    toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
  };

  if (!useMapsGrounding) {
    generateContentConfig.responseMimeType = "application/json";
    generateContentConfig.responseSchema = {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING, description: 'The travel destination.' },
        duration: { type: Type.NUMBER, description: 'Duration of the trip in days.' },
        overview: { type: Type.STRING, description: 'A brief overview of the trip.' },
        itinerary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.NUMBER, description: 'Day number.' },
              theme: { type: Type.STRING, description: 'Theme for the day.' },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING, description: 'Time of the activity (e.g., "9:00 AM").' },
                    description: { type: Type.STRING, description: 'Description of the activity.' },
                  },
                  required: ['time', 'description'],
                },
              },
            },
            required: ['day', 'theme', 'activities'],
          },
        },
        packingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Suggestions for what to pack.' },
        notes: { type: Type.STRING, description: 'Any additional important notes for the trip.' },
        budgetSummary: { type: Type.STRING, description: 'A summary or analysis of the trip budget.' },
      },
      required: ['destination', 'duration', 'overview', 'itinerary', 'packingSuggestions', 'notes', 'budgetSummary'],
    };
  }


  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [{ text: prompt }]
      },
      config: generateContentConfig,
    });

    const rawResponseText = response.text.trim();
    console.log("Raw response from Gemini:", rawResponseText);

    const cleanedJsonString = extractJsonFromString(rawResponseText);
    let parsedItinerary: GeneratedItinerary;

    if (!cleanedJsonString) {
      console.warn("Could not extract valid JSON from Gemini response. Falling back to plain text interpretation.");
      // Fallback: If no valid JSON can be extracted, use the raw response as overview.
      parsedItinerary = {
        destination: preferences.destination,
        duration: preferences.duration,
        overview: rawResponseText,
        itinerary: [],
        packingSuggestions: [],
        notes: "Itinerary tidak dapat diuraikan ke format terstruktur. Silakan lihat bagian ikhtisar untuk detail dan periksa tautan sumber.",
        budgetSummary: `Anggaran: ${budget} ${currency}.`,
      };
      // For this fallback, we also don't process source URLs, as the structure might be completely off.
      return { itineraryData: parsedItinerary, sourceUrls: [] };
    }

    // Now proceed with parsing the cleaned JSON string
    if (useMapsGrounding) {
      try {
        parsedItinerary = JSON.parse(cleanedJsonString) as GeneratedItinerary;
        if (!parsedItinerary || !parsedItinerary.destination || !Array.isArray(parsedItinerary.itinerary)) {
          throw new Error("Struktur JSON yang diuraikan tidak valid untuk itinerary saat Maps grounding aktif.");
        }
      } catch (parseError) {
        console.warn("Gagal menguraikan JSON (bahkan setelah pembersihan) saat Maps grounding aktif. Kembali ke interpretasi teks biasa.");
        parsedItinerary = {
          destination: preferences.destination,
          duration: preferences.duration,
          overview: rawResponseText,
          itinerary: [],
          packingSuggestions: [],
          notes: "Itinerary tidak dapat diuraikan ke format terstruktur. Silakan lihat bagian ikhtisar untuk detail dan periksa tautan sumber.",
          budgetSummary: `Anggaran: ${budget} ${currency}.`,
        };
        return { itineraryData: parsedItinerary, sourceUrls: [] }; // No source URLs if parsing fails here.
      }
    } else {
      try {
        parsedItinerary = JSON.parse(cleanedJsonString) as GeneratedItinerary;
        if (!parsedItinerary || !parsedItinerary.destination || !Array.isArray(parsedItinerary.itinerary)) {
          throw new Error("Respons API tidak berisi struktur itinerary yang valid.");
        }
      } catch (parseError) {
        console.error("Gagal menguraikan JSON:", parseError);
        throw new Error("Respons JSON tidak valid dari API, atau data terstruktur hilang.");
      }
    }

    const sourceUrls: { uri: string; title?: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) {
          sourceUrls.push({ uri: chunk.web.uri, title: chunk.web.title });
        } else if (chunk.maps) {
          sourceUrls.push({ uri: chunk.maps.uri, title: chunk.maps.title });
          if (chunk.maps.placeAnswerSources?.reviewSnippets) {
            chunk.maps.placeAnswerSources.reviewSnippets.forEach(snippet => {
              const reviewSource = snippet as { uri: string; title?: string };
              sourceUrls.push({ uri: reviewSource.uri, title: reviewSource.title || 'Review Link' });
            });
          }
        }
      }
    }
    
    return { itineraryData: parsedItinerary, sourceUrls };

  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    if (error.message.includes("Requested entity was not found.")) {
      throw new Error("Kunci API mungkin tidak valid atau tidak terpilih. Harap pastikan Anda telah memilih kunci API berbayar yang valid melalui dialog pemilihan kunci API.");
    }
    if (error instanceof Error) {
      throw new Error(`Kesalahan API Gemini: ${error.message}`);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui saat memanggil API Gemini.');
  }
}