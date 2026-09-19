const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({
    register
});
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  registers: [register]
});
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  registers: [register]
});

const httpResponseStatusTotal = new client.Counter({
  name: 'http_response_status_total',
  help: 'Total number of HTTP responses by status class',
  labelNames: ['status_class'],
  registers: [register]
});

app.use(helmet());
app.use(morgan('combined'));

app.use((req, res, next) => {
  httpRequestsTotal.inc();

  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end();

    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;

    httpResponseStatusTotal.inc({
        status_class: statusClass
    });
});

  next();
});

app.get('/', (req, res) => {
  res.send('Secure Platform Lab Running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((req, res) => {
  res.status(404).json({
      error: 'Not Found',
      message: 'Route does not exist'
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
  });
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
