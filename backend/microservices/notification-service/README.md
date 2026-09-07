# Notification Service

This service processes async notification jobs via BullMQ.

## Queue

- Default queue name: `global_notification_dispatch`
- Recommended tenant-aware queue naming: `<tenant_id>__notification__dispatch`

## Run

```bash
npm run start:notification
```

## Job payloads

- `sms-otp`: `{ kind: 'sms-otp', phone, code }`
- `email-verification`: `{ kind: 'email-verification', email, code }`
- `email-password-reset`: `{ kind: 'email-password-reset', email, code }`
