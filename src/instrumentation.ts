import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const isProduction = process.env.NODE_ENV === 'production';

const sdkConfig = {
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'api-guide-typescript',
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '2.3.0',
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
        }),
    ],
};

// Only wire up the OTLP exporter in production to avoid noise in dev/test
if (isProduction) {
    Object.assign(sdkConfig, {
        traceExporter: new OTLPTraceExporter({
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        }),
    });
}

const sdk = new NodeSDK(sdkConfig);

sdk.start();

process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry SDK shut down'))
        .catch(error => console.error('Error shutting down OpenTelemetry SDK', error))
        .finally(() => process.exit(0));
});

export default sdk;
