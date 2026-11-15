/** Small source-preserving excerpt from the NASA OSDR RadLab API; never a crew measurement. */
export const RADLAB_EXCERPT = {
  portalVersion: '1.1.2',
  retrievedAt: '2026-11-12T17:24:28Z',
  source: 'NASA Open Science Data Repository · RadLab API',
  sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/api/?absorbed_dose_rate%3E2=&altitude=&b=&flux=&format=html&instrument=DosTel&l=&latitude=&longitude=&spacecraft=ISS&timestamp%3C2022-04-02T01:05=&timestamp%3E=2022-04-01T23:00',
  query: 'spacecraft=ISS; instrument=DosTel; timestamp>=2022-04-01T23:00; timestamp<2022-04-02T01:05; absorbed_dose_rate>2',
  timestampNote: 'Timestamp strings are preserved as returned by the API. The response does not include an explicit UTC offset.',
  transformation: 'Four returned rows selected for display; values and source timestamp strings are unchanged. Units are labeled using the RadLab API field documentation.',
  unit: 'μGy/hour',
  spacecraft: 'ISS',
  records: [
    { id: 'NASA-RADLAB-ISS-20220401-230000-DOSTEL2', at: '2022-04-01T23:00:00', value: 10.2160856666667, instrument: 'DosTel2' },
    { id: 'NASA-RADLAB-ISS-20220401-230000-DOSTEL1', at: '2022-04-01T23:00:00', value: 9.815504, instrument: 'DosTel1' },
    { id: 'NASA-RADLAB-ISS-20220401-230033-DOSTEL1', at: '2022-04-01T23:00:33', value: 9.835079, instrument: 'DosTel1' },
    { id: 'NASA-RADLAB-ISS-20220401-230035-DOSTEL2', at: '2022-04-01T23:00:35', value: 11.088263, instrument: 'DosTel2' },
  ],
} as const;
