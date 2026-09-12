"use client";

import { useSyncExternalStore } from "react";

/**
 * Готовность первого экрана: экран загрузки ушёл, страница видна.
 *
 * Нужно тому, что появляется анимацией при открытии сайта. Без общего сигнала
 * такая анимация стартует по монтированию — то есть под `SiteLoader`, и к
 * моменту, когда его снимут, она уже отыграна: пользователь видит готовый
 * экран вместо появления.
 *
 * Хранилище модульное, а не контекст: подписчиков мало, живут они в разных
 * ветках дерева, и провайдер вокруг всего сайта ради одного булева значения
 * был бы дороже самой задачи.
 */

let ready = false;
const listeners = new Set<() => void>();

/** Вызывает `SiteLoader`, когда снимает себя с экрана. */
export function markSiteReady() {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSiteReady(): boolean {
  // На сервере всегда `false`: разметка первого кадра должна совпасть с той,
  // что отрисует клиент до сигнала, иначе гидратация ругается.
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
}
