/**
 * Иллюстрация пустого состояния переписки.
 *
 * Нарисована здесь, а не выгружена из макета: на тарифе Figma исчерпан лимит
 * MCP-вызовов, а тащить в проект случайную картинку ради заглушки хуже, чем
 * повторить форму — жёлтый пузырь сообщения, колокольчик и билет. Когда ассет
 * выгрузят, компонент заменяется на `Image` без правок вызывающей стороны.
 */
export function EmptyChatArt() {
  return (
    <svg
      viewBox="0 0 384 187"
      fill="none"
      role="presentation"
      aria-hidden
      className="h-48 w-auto max-w-full"
    >
      {/* Тень под композицией — мягкое пятно, как в макете. */}
      <ellipse cx="192" cy="172" rx="144" ry="8" fill="var(--color-db-text-primary)" opacity="0.05" />

      {/* Билет, торчащий из-под пузыря. */}
      <g transform="rotate(-8 236 128)">
        <rect x="196" y="108" width="120" height="46" rx="10" fill="#ffffff" />
        <rect
          x="196.5"
          y="108.5"
          width="119"
          height="45"
          rx="9.5"
          stroke="var(--color-db-border-default)"
        />
        <path d="M232 108v46" stroke="var(--color-db-border-default)" strokeDasharray="4 4" />
        <path
          d="M246 133c6-2 12-5 17-9l6 2c1 .4 1 1.8-.2 2.3l-9 3.8c-3 1.3-6 2.3-9 3l-4.8 1.2c-1.2.3-2-1.2-1-2l1-1.3Z"
          fill="var(--color-db-surface-base)"
        />
        <rect x="246" y="142" width="52" height="4" rx="2" fill="var(--color-db-surface-muted)" />
      </g>

      {/* Пузырь сообщения. */}
      <path
        d="M120 36h136c11 0 20 9 20 20v52c0 11-9 20-20 20H166l-26 20 4-20h-24c-11 0-20-9-20-20V56c0-11 9-20 20-20Z"
        fill="var(--color-db-surface-base)"
      />
      <rect x="140" y="60" width="96" height="8" rx="4" fill="#ffffff" />
      <rect x="140" y="78" width="116" height="8" rx="4" fill="#ffffff" />
      <rect x="140" y="96" width="72" height="8" rx="4" fill="#ffffff" />

      {/* Колокольчик уведомления. */}
      <circle cx="272" cy="44" r="24" fill="var(--color-db-surface-base)" />
      <circle cx="272" cy="44" r="24" stroke="#ffffff" strokeWidth="4" />
      <path
        d="M272 32c-5 0-9 4-9 9v6l-3 4c-.6.8 0 2 1 2h22c1 0 1.6-1.2 1-2l-3-4v-6c0-5-4-9-9-9Z"
        fill="var(--color-db-text-primary)"
      />
      <path
        d="M268 55a4 4 0 0 0 8 0h-8Z"
        fill="var(--color-db-text-primary)"
      />

      {/* Искры — те же, что на «Возврат оформлен»: одна семья иллюстраций. */}
      <path
        d="M104 24c0-1 1-1 1 0l1.4 4.6 4.6 1.4c1 .3 1 1.2 0 1.5l-4.6 1.4-1.4 4.6c-.3 1-1.2 1-1.5 0L102 33l-4.6-1.4c-1-.3-1-1.2 0-1.5l4.6-1.4L104 24Z"
        fill="var(--color-db-surface-base)"
      />
      <path
        d="M318 78c0-1 1-1 1 0l1 3.4 3.4 1c1 .3 1 1.2 0 1.5l-3.4 1-1 3.4c-.3 1-1.2 1-1.5 0l-1-3.4-3.4-1c-1-.3-1-1.2 0-1.5l3.4-1 1-3.4Z"
        fill="var(--color-db-surface-base)"
      />
    </svg>
  );
}
