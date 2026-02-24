// const { BetaAnalyticsDataClient } = require('@google-analytics/data');
// require('dotenv').config();

// const analyticsConfig = {
//   type: process.env.GOOGLE_ANALYTICS_TYPE,
//   project_id: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
//   private_key_id: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY_ID,
//   private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.replace(/\\n/g, '\n'),
//   client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
//   client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID,
//   auth_uri: process.env.GOOGLE_ANALYTICS_AUTH_URI,
//   token_uri: process.env.GOOGLE_ANALYTICS_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.GOOGLE_ANALYTICS_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.GOOGLE_ANALYTICS_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.GOOGLE_ANALYTICS_UNIVERSE_DOMAIN
// };

// const analyticsDataClient = new BetaAnalyticsDataClient({
//   credentials: analyticsConfig,
// });

// async function getAnalyticsData() {
//   try {
//     const today = new Date();
//     const oneMonthAgo = new Date(today);
//     oneMonthAgo.setMonth(today.getMonth() - 1);
//     const oneMonthAgoFormatted = oneMonthAgo.toISOString().split('T')[0];
//     const todayFormatted = today.toISOString().split('T')[0];

//     const [response] = await analyticsDataClient.runReport({
//       property: 'properties/455511255',
//       dateRanges: [
//         {
//           startDate: oneMonthAgoFormatted,
//           endDate: todayFormatted,
//         },
//       ],
//       dimensions: [{ name: 'date' }],
//       metrics: [
//         { name: 'sessions' },
//         { name: 'screenPageViews' },
//         { name: 'activeUsers' },
//         { name: 'newUsers' },
//         { name: 'averageSessionDuration' },
//         { name: 'bounceRate' },
//         { name: 'totalUsers' },
//         { name: 'conversions' },
//         { name: 'userEngagementDuration' },
//       ],
//     });

//     return response.rows.map(row => ({
//       date: row.dimensionValues[0].value,
//       sessions: row.metricValues[0].value,
//       pageviews: row.metricValues[1].value,
//       activeUsers: row.metricValues[2].value,
//       newUsers: row.metricValues[3].value,
//       avgSessionDuration: row.metricValues[4].value,
//       bounceRate: row.metricValues[5].value,
//       totalUsers: row.metricValues[6].value,
//       conversions: row.metricValues[7].value,
//       engagementTime: row.metricValues[8].value,
//     }));
//   } catch (error) {
//     console.error('Erreur lors de la récupération des données Google Analytics:', error.message);
//     throw new Error('Impossible de récupérer les données Google Analytics');
//   }
// }

// module.exports = { getAnalyticsData };