import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import logger from './utils/logger.js';

let sdk: NodeSDK | undefined;

if (process.env.NODE_ENV === 'production') {
    const version = process.env.APP_VERSION || '2.3.0';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (!otlpEndpoint) {
        logger.info('OpenTelemetry disabled: OTEL_EXPORTER_OTLP_ENDPOINT is not configured');
    } else {
        sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]: 'api-guide-typescript',
                [ATTR_SERVICE_VERSION]: version,
            }),
            traceExporter: new OTLPTraceExporter({
                url: otlpEndpoint,
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                    '@opentelemetry/instrumentation-dns': { enabled: false },
                }),
            ],
        });

        try {
            sdk.start();
        } catch (error: unknown) {
            logger.error('Failed to start OpenTelemetry SDK', error as Error);
        }
    }
}

export default sdk;
