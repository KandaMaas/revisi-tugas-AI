import { GoogleGenAI, Type } from "@google/genai";
import { TravelPreferences, GeneratedItinerary, ItineraryResult } from '../types';

/**
 * Helper function to extract a valid JSON string from a potentially malformed string
 * that might include markdown fences or leading/trailing text.
 */
function extractJsonFromString(input: string): string | null {
  // Step 1: Aggressively remove common markdown fences and any text before the first potential JSON start.
  // This regex handles ```json, ```javascript, ```text, ``` and also just ```.
  let cleanedInput = input.replace(/```(?:json|javascript|text)?\s*|```/g, '').trim();

  // Find the first and last occurrence of { or [
  let firstCharIndex = -1;
  let lastCharIndex = -1;

  const firstBrace = cleanedInput.indexOf('{');
  const firstBracket = cleanedInput.indexOf('[');

  // Determine the true start of the JSON (either { or [)
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    firstCharIndex = firstBrace;
  } else if (firstBracket !== -1) {
    firstCharIndex = firstBracket;
  }

  // If no starting brace/bracket, no JSON to extract
  if (firstCharIndex === -1) {
    return null;
  }

  // Find the last corresponding closing brace or bracket
  // We need to match based on the type of the first character found
  const typeOfStart = cleanedInput[firstCharIndex];
  if (typeOfStart === '{') {
    lastCharIndex = cleanedInput.lastIndexOf('}');
  } else if (typeOfStart === '[') {
    lastCharIndex = cleanedInput.lastIndexOf(']');
  }

  // Ensure both start and end characters are found and in correct order
  if (lastCharIndex === -1 || lastCharIndex < firstCharIndex) {
    return null;
  }

  const jsonCandidate = cleanedInput.substring(firstCharIndex, lastCharIndex + 1);

  // Step 2: Attempt to parse the extracted candidate
  if (jsonCandidate) {
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch (e) {
      console.warn("Failed to parse extracted JSON candidate:", e);
      // If parsing fails even after cleaning, it's not valid JSON
      return null;
    }
  }

  return null; // Should not reach here if jsonCandidate is not null and parsing succeeded.
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

  let prompt = `Buat itinerary perjalanan yang detail dan kreatif untuk perjalanan ${duration} hari ke ${destination}.
  Wisatawan tertarik pada ${interests}. Mereka memiliki anggaran sebesar ${budget} ${currency}.
  
  Harap sertakan:
  - Ikhtisar perjalanan.
  - Rincian rencana harian dengan tema dan aktivitas spesifik (dengan waktu yang disarankan).
  - Saran barang bawaan yang praktis.
  - Catatan penting untuk perjalanan.
  - Ringkasan atau analisis tentang bagaimana anggaran ${budget} ${currency} dapat memengaruhi perencanaan perjalanan atau apa yang bisa didapatkan.
  
  Buat itinerary dalam format JSON, dan semua teks dalam properti JSON harus dalam Bahasa Indonesia.
  Jika relevan, sertakan saran yang berfokus pada Indonesia untuk rekomendasi umum dan penelusuran.`;

  const tools = [];
  const toolConfig: any = {};
  let modelToUse: string;
  let useMapsGrounding = false;

  if (latitude && longitude) {
    useMapsGrounding = true;
    prompt += ` Lokasi pengguna saat ini kira-kira lintang ${latitude}, bujur ${longitude}.`;
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
      console.warn("Tidak dapat mengekstrak JSON valid dari respons Gemini. Kembali ke interpretasi teks biasa.");
      parsedItinerary = {
        destination: preferences.destination,
        duration: preferences.duration,
        overview: rawResponseText,
        itinerary: [],
        packingSuggestions: [],
        notes: "Itinerary tidak dapat diuraikan ke format terstruktur. Silakan lihat bagian ikhtisar untuk detail dan periksa tautan sumber.",
        budgetSummary: `Anggaran: ${budget} ${currency}.`,
      };
      return { itineraryData: parsedItinerary, sourceUrls: [] };
    }

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
        return { itineraryData: parsedItinerary, sourceUrls: [] };
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