import { VedicChart } from "../types";

// Sample Vedic astrology chart data for demonstration
export const mockVedicData: VedicChart = {
  birthChart: {
    ascendant: 1, // Aries ascendant
    planets: [
      {
        id: "sun",
        name: "Sun",
        sign: 9, // Sagittarius
        house: 9,
        degree: 15.5,
        nakshatra: "Purva Ashadha",
        isRetrograde: false,
        color: "#E8A87C"
      },
      {
        id: "moon",
        name: "Moon",
        sign: 4, // Cancer
        house: 4,
        degree: 8.2,
        nakshatra: "Pushya",
        isRetrograde: false,
        color: "#D0D6DE"
      },
      {
        id: "mercury",
        name: "Mercury",
        sign: 9, // Sagittarius
        house: 9,
        degree: 5.8,
        nakshatra: "Moola",
        isRetrograde: false,
        color: "#85CDCA"
      },
      {
        id: "venus",
        name: "Venus",
        sign: 8, // Scorpio
        house: 8,
        degree: 22.3,
        nakshatra: "Jyeshtha",
        isRetrograde: false,
        color: "#C38DD9"
      },
      {
        id: "mars",
        name: "Mars",
        sign: 2, // Taurus
        house: 2,
        degree: 28.6,
        nakshatra: "Mrigashira",
        isRetrograde: false,
        color: "#E27D60"
      },
      {
        id: "jupiter",
        name: "Jupiter",
        sign: 12, // Pisces
        house: 12,
        degree: 5.1,
        nakshatra: "Purva Bhadrapada",
        isRetrograde: true,
        color: "#E8DE92"
      },
      {
        id: "saturn",
        name: "Saturn",
        sign: 10, // Capricorn
        house: 10,
        degree: 18.9,
        nakshatra: "Shravana",
        isRetrograde: false,
        color: "#4056A1"
      },
      {
        id: "rahu",
        name: "Rahu",
        sign: 6, // Virgo
        house: 6,
        degree: 2.5,
        nakshatra: "Uttara Phalguni",
        isRetrograde: false,
        color: "#6CA6C1"
      },
      {
        id: "ketu",
        name: "Ketu",
        sign: 12, // Pisces
        house: 12,
        degree: 2.5,
        nakshatra: "Uttara Bhadrapada",
        isRetrograde: false,
        color: "#FE5F55"
      }
    ],
    houses: [
      {
        number: 1,
        sign: 1, // Aries
        signName: "Aries",
        lord: "Mars",
        planets: ["Ascendant"],
        strength: "strong",
        aspects: ["Saturn aspect", "Jupiter aspect"]
      },
      {
        number: 2,
        sign: 2, // Taurus
        signName: "Taurus",
        lord: "Venus",
        planets: ["Mars"],
        strength: "moderate",
        aspects: ["Saturn aspect"]
      },
      {
        number: 3,
        sign: 3, // Gemini
        signName: "Gemini",
        lord: "Mercury",
        planets: [],
        strength: "weak",
        aspects: []
      },
      {
        number: 4,
        sign: 4, // Cancer
        signName: "Cancer",
        lord: "Moon",
        planets: ["Moon"],
        strength: "strong",
        aspects: ["Mars aspect"]
      },
      {
        number: 5,
        sign: 5, // Leo
        signName: "Leo",
        lord: "Sun",
        planets: [],
        strength: "moderate",
        aspects: []
      },
      {
        number: 6,
        sign: 6, // Virgo
        signName: "Virgo",
        lord: "Mercury",
        planets: ["Rahu"],
        strength: "moderate",
        aspects: []
      },
      {
        number: 7,
        sign: 7, // Libra
        signName: "Libra",
        lord: "Venus",
        planets: [],
        strength: "weak",
        aspects: ["Mars aspect"]
      },
      {
        number: 8,
        sign: 8, // Scorpio
        signName: "Scorpio",
        lord: "Mars",
        planets: ["Venus"],
        strength: "moderate",
        aspects: []
      },
      {
        number: 9,
        sign: 9, // Sagittarius
        signName: "Sagittarius",
        lord: "Jupiter",
        planets: ["Sun", "Mercury"],
        strength: "strong",
        aspects: []
      },
      {
        number: 10,
        sign: 10, // Capricorn
        signName: "Capricorn",
        lord: "Saturn",
        planets: ["Saturn"],
        strength: "strong",
        aspects: []
      },
      {
        number: 11,
        sign: 11, // Aquarius
        signName: "Aquarius",
        lord: "Saturn",
        planets: [],
        strength: "moderate",
        aspects: []
      },
      {
        number: 12,
        sign: 12, // Pisces
        signName: "Pisces",
        lord: "Jupiter",
        planets: ["Jupiter", "Ketu"],
        strength: "moderate",
        aspects: []
      }
    ]
  },
  dashas: {
    currentMahadasha: {
      planet: "Saturn",
      startDate: "2019-04-12",
      endDate: "2038-04-12",
      subPeriods: [
        {
          planet: "Saturn",
          startDate: "2019-04-12",
          endDate: "2022-04-13"
        },
        {
          planet: "Mercury",
          startDate: "2022-04-13",
          endDate: "2025-01-20"
        },
        {
          planet: "Ketu",
          startDate: "2025-01-20",
          endDate: "2026-03-02"
        },
        {
          planet: "Venus",
          startDate: "2026-03-02",
          endDate: "2029-05-01"
        },
        {
          planet: "Sun",
          startDate: "2029-05-01",
          endDate: "2030-04-14"
        },
        {
          planet: "Moon",
          startDate: "2030-04-14",
          endDate: "2031-11-13"
        },
        {
          planet: "Mars",
          startDate: "2031-11-13",
          endDate: "2033-01-22"
        },
        {
          planet: "Rahu",
          startDate: "2033-01-22",
          endDate: "2035-12-01"
        },
        {
          planet: "Jupiter",
          startDate: "2035-12-01",
          endDate: "2038-04-12"
        }
      ]
    },
    currentAntardasha: {
      planet: "Mercury",
      startDate: "2022-04-13",
      endDate: "2025-01-20"
    },
    sequence: [
      {
        planet: "Moon",
        startDate: "2010-07-12",
        endDate: "2019-04-12",
        subPeriods: [
          {
            planet: "Moon",
            startDate: "2010-07-12",
            endDate: "2012-05-12"
          },
          {
            planet: "Mars",
            startDate: "2012-05-12",
            endDate: "2013-12-12"
          },
          {
            planet: "Rahu",
            startDate: "2013-12-12",
            endDate: "2015-06-12"
          },
          {
            planet: "Jupiter",
            startDate: "2015-06-12",
            endDate: "2016-10-12"
          },
          {
            planet: "Saturn",
            startDate: "2016-10-12",
            endDate: "2018-05-12"
          },
          {
            planet: "Mercury",
            startDate: "2018-05-12",
            endDate: "2019-04-12"
          }
        ]
      },
      {
        planet: "Saturn",
        startDate: "2019-04-12",
        endDate: "2038-04-12",
        subPeriods: [
          {
            planet: "Saturn",
            startDate: "2019-04-12",
            endDate: "2022-04-13"
          },
          {
            planet: "Mercury",
            startDate: "2022-04-13",
            endDate: "2025-01-20"
          },
          {
            planet: "Ketu",
            startDate: "2025-01-20",
            endDate: "2026-03-02"
          },
          {
            planet: "Venus",
            startDate: "2026-03-02",
            endDate: "2029-05-01"
          },
          {
            planet: "Sun",
            startDate: "2029-05-01",
            endDate: "2030-04-14"
          },
          {
            planet: "Moon",
            startDate: "2030-04-14",
            endDate: "2031-11-13"
          },
          {
            planet: "Mars",
            startDate: "2031-11-13",
            endDate: "2033-01-22"
          },
          {
            planet: "Rahu",
            startDate: "2033-01-22",
            endDate: "2035-12-01"
          },
          {
            planet: "Jupiter",
            startDate: "2035-12-01",
            endDate: "2038-04-12"
          }
        ]
      },
      {
        planet: "Mercury",
        startDate: "2038-04-12",
        endDate: "2055-04-12",
        subPeriods: []
      },
      {
        planet: "Ketu",
        startDate: "2055-04-12",
        endDate: "2062-04-12",
        subPeriods: []
      },
      {
        planet: "Venus",
        startDate: "2062-04-12",
        endDate: "2082-04-12",
        subPeriods: []
      },
      {
        planet: "Sun",
        startDate: "2082-04-12",
        endDate: "2088-04-12",
        subPeriods: []
      },
      {
        planet: "Mars",
        startDate: "2088-04-12",
        endDate: "2095-04-12",
        subPeriods: []
      }
    ]
  },
  yogas: [
    {
      name: "Gajakesari Yoga",
      strength: "strong",
      description: "Formed by Moon and Jupiter being in angular houses (kendras) from each other. Brings wealth, fame, spiritual growth, and success in education and career.",
      planets: ["Moon", "Jupiter"],
      houses: [4, 12]
    },
    {
      name: "Budha-Aditya Yoga",
      strength: "very strong",
      description: "Formed by Sun and Mercury conjunction. Grants intelligence, articulate speech, success in education, leadership qualities, and recognition in career.",
      planets: ["Sun", "Mercury"],
      houses: [9]
    },
    {
      name: "Neecha Bhanga Raja Yoga",
      strength: "moderate",
      description: "A special Raja Yoga formed when a planet in debilitation is influenced by its lord, bringing unexpected success and reversal of adverse conditions.",
      planets: ["Venus", "Mars"],
      houses: [8, 2]
    },
    {
      name: "Pancha Mahapurusha Yoga (Sasha)",
      strength: "strong",
      description: "One of the five great person yogas, formed when Saturn is in its own sign in an angular house, giving discipline, perseverance, and success through hard work.",
      planets: ["Saturn"],
      houses: [10]
    },
    {
      name: "Dhana Yoga",
      strength: "moderate",
      description: "A wealth-generating yoga formed when lords of the 5th and 9th houses are in the 11th house or have mutual aspects, creating financial prosperity.",
      planets: ["Sun", "Jupiter"],
      houses: [9, 12]
    }
  ],
  doshas: [
    {
      name: "Kuja Dosha (Manglik)",
      severity: "moderate",
      description: "Mars placed in the 1st, 4th, 7th, 8th, or 12th house can create challenges in marriage and partnerships due to the fiery and aggressive nature of Mars.",
      remedies: [
        "Wearing a red coral gemstone after proper astrological consultation",
        "Reciting Mars mantras like 'Om Angarakaya Namaha' or 'Om Kraam Kreem Kraum Sah Bhaumaya Namah'",
        "Performing Mars pacification rituals (Kuja Shanti)",
        "Donating red lentils, jaggery, or copper on Tuesdays"
      ],
      affectedAreas: ["Marriage", "Partnerships", "Home harmony"]
    },
    {
      name: "Grahan Yoga (Eclipse Influence)",
      severity: "mild",
      description: "Formed when Rahu/Ketu are conjunct or closely aspecting Sun or Moon, creating confusion, anxiety, and fluctuations in career and emotional stability.",
      remedies: [
        "Wearing a hessonite (gomed) gemstone for Rahu or cat's eye (lahsuniya) for Ketu",
        "Performing Navagraha puja (nine planets worship)",
        "Reciting specific mantras for Rahu and Ketu",
        "Donating black sesame seeds, black clothes, or black umbrella"
      ],
      affectedAreas: ["Mental peace", "Career stability", "Decision-making"]
    },
    {
      name: "Retrograde Jupiter Influence",
      severity: "mild",
      description: "Jupiter in retrograde motion can delay the positive results of Jupiter, affecting education, children, wisdom, and spiritual growth.",
      remedies: [
        "Wearing a yellow sapphire (pukhraj) gemstone",
        "Reciting Jupiter mantras like 'Om Gram Greem Graum Sah Gurave Namah'",
        "Reading or listening to spiritual scriptures",
        "Feeding Brahmins or donating yellow items on Thursdays"
      ],
      affectedAreas: ["Education", "Children", "Spiritual growth"]
    }
  ]
}; 