"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderInfo, StartOrder, PassengerInput, BuyResult } from "@/lib/donbilet-api";

type Citizenship = { iso: number; name: string };

type PassengerForm = {
  fName: string;
  lName: string;
  sName: string;
  bDay: string;
  sex: "m" | "f";
  citizenshipISO: number;
  docTypeID: string;
  docNum: string;
  placeID: string; // id места из схемы салона; "FS" при свободной рассадке
};

// Пример ввода по регулярной маске документа (для подсказки под полем).
function docExample(mask?: string): string | null {
  if (!mask) return null;
  if (mask.includes("\\d{4} \\d{6}")) return "1234 567890";
  if (mask.includes("IVXLC")) return "II-АН 123456";
  if (mask.includes("\\d{2} \\d{7}")) return "12 3456789";
  if (mask.includes("\\d{6,7}")) return "АБ 1234567";
  return null;
}

function emptyPassenger(defaultCitizenship: number, defaultDoc: string, place: string): PassengerForm {
  return { fName: "", lName: "", sName: "", bDay: "", sex: "m", citizenshipISO: defaultCitizenship, docTypeID: defaultDoc, docNum: "", placeID: place };
}

function Timer({ from }: { from: number }) {
  const [left, setLeft] = useState(20 * 60);
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, 20 * 60 - Math.floor((Date.now() - from) / 1000))), 1000);
    return () => clearInterval(id);
  }, [from]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className={`font-medium ${left < 120 ? "text-[#c0392b]" : "text-[#191919]"}`}>
      Бронь действует ещё {mm}:{ss}
    </span>
  );
}

export function BuyFlow() {
  const params = useSearchParams();
  const scheduleId = Number(params.get("scheduleid") ?? "");
  const person = Math.min(Math.max(Number(params.get("person") ?? "1"), 1), 10);

  const [start, setStart] = useState<StartOrder | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [citizenships, setCitizenships] = useState<Citizenship[]>([]);
  const [initError, setInitError] = useState<string | undefined>(scheduleId ? undefined : "Не выбран рейс.");
  const [startedAt, setStartedAt] = useState<number>(0);

  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [insuranceID, setInsuranceID] = useState(0);
  const [subscribe, setSubscribe] = useState(false);
  const [confirmPolicy, setConfirmPolicy] = useState(false);
  const [confirmPd, setConfirmPd] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [payment, setPayment] = useState<BuyResult | null>(null);
  const [retry, setRetry] = useState(0);

  // Инициализация заказа: start → getpass → citizenships.
  useEffect(() => {
    if (!scheduleId) return;
    let active = true;
    (async () => {
      try {
        const sRes = await fetch(`/api/purchase/start?scheduleid=${scheduleId}&person=${person}`, { cache: "no-store" });
        const sJson = await sRes.json();
        if (!active) return;
        if (!sRes.ok) {
          setInitError(sJson.error ?? "Не удалось начать оформление.");
          return;
        }
        const startData: StartOrder = sJson.data;
        setStart(startData);
        setStartedAt(Date.now());

        const [oRes, cRes] = await Promise.all([
          fetch(`/api/purchase/order?uuid=${startData.uuid}&orderid=${startData.orderid}`, { cache: "no-store" }),
          fetch(`/api/purchase/citizenships`, { cache: "no-store" }),
        ]);
        const oJson = await oRes.json();
        const cJson = await cRes.json();
        if (!active) return;
        if (!oRes.ok) {
          setInitError(oJson.error ?? "Заказ недоступен.");
          return;
        }
        const info: OrderInfo = oJson.data;
        setOrder(info);
        setCitizenships(cJson.data ?? []);
        const defCit = 643;
        const defDoc = info.docTypes?.[0]?.id ?? "1";
        const freeSeating = info.isFreePlaces !== "N";
        setPassengers(
          Array.from({ length: info.passcount || person }, () => emptyPassenger(defCit, defDoc, freeSeating ? "FS" : "")),
        );
        if (info.email) setEmail(info.email);
        if (info.phone) setPhone(info.phone);
      } catch {
        if (active) setInitError("Сервис временно недоступен.");
      }
    })();
    return () => {
      active = false;
    };
  }, [scheduleId, person, retry]);

  const insurancePrice = useMemo(
    () => order?.insurance.find((i) => i.id === insuranceID)?.price ?? 0,
    [order, insuranceID],
  );
  // totalCost приходит 0 до сохранения пассажиров, поэтому считаем от цены за место.
  const total = useMemo(() => {
    if (!order) return 0;
    const base = order.totalCost > 0 ? order.totalCost : order.price * passengers.length;
    return base + insurancePrice * passengers.length;
  }, [order, insurancePrice, passengers.length]);

  function updatePassenger(idx: number, patch: Partial<PassengerForm>) {
    setPassengers((list) => list.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  const freeSeating = order?.isFreePlaces !== "N";
  // Только свободные места: type 1 — свободное, 2 — занято, 0 — проход/пусто.
  const availableSeats = useMemo(
    () => (order?.places ?? []).filter((p) => p.type === 1 && p.id !== "-"),
    [order],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !order) return;
    setSubmitError(undefined);

    if (!confirmPolicy || !confirmPd) {
      setSubmitError("Отметьте согласие с условиями и обработкой персональных данных.");
      return;
    }
    // Валидация данных пассажиров: ФИО, дата рождения, номер документа по маске из getpass.
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const who = `Пассажир ${i + 1}: `;
      if (!p.lName.trim() || !p.fName.trim()) {
        setSubmitError(who + "укажите фамилию и имя.");
        return;
      }
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(p.bDay.trim())) {
        setSubmitError(who + "дата рождения в формате ДД.ММ.ГГГГ (например 10.05.1990).");
        return;
      }
      const [dd, mm, yyyy] = p.bDay.trim().split(".").map(Number);
      const dt = new Date(yyyy, mm - 1, dd);
      if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd || dt > new Date()) {
        setSubmitError(who + "проверьте дату рождения.");
        return;
      }
      const doc = order.docTypes.find((d) => d.id === p.docTypeID);
      if (doc?.mask) {
        try {
          if (!new RegExp(doc.mask).test(p.docNum.trim())) {
            setSubmitError(`${who}номер документа не соответствует формату «${doc.name}».`);
            return;
          }
        } catch {
          /* некорректная маска с сервера — пропускаем проверку */
        }
      }
    }
    if (!freeSeating) {
      const chosen = passengers.map((p) => p.placeID).filter(Boolean);
      if (chosen.length < passengers.length) {
        setSubmitError("Выберите место для каждого пассажира.");
        return;
      }
      if (new Set(chosen).size !== chosen.length) {
        setSubmitError("Одно место выбрано для нескольких пассажиров.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payloadPassengers: PassengerInput[] = passengers.map((p, i) => {
        const cit = citizenships.find((c) => c.iso === p.citizenshipISO);
        const doc = order.docTypes.find((d) => d.id === p.docTypeID);
        const seat = availableSeats.find((s) => s.id === p.placeID);
        const placeNum = freeSeating ? "FS" : seat?.number ?? p.placeID;
        const placeId = freeSeating ? "FS" : p.placeID;
        return {
          fName: p.fName,
          lName: p.lName,
          sName: p.sName || "-",
          bDay: p.bDay,
          sex: p.sex,
          citizenshipISO: p.citizenshipISO,
          citizenshipName: cit?.name ?? "Российская Федерация",
          docNum: p.docNum,
          docTypeID: p.docTypeID,
          docType: doc?.name ?? "",
          baggage: 0,
          placeNum,
          placeID: placeId,
          place: placeNum,
          passangerID: String(i + 1),
        };
      });

      const addRes = await fetch(`/api/purchase/passengers?uuid=${start.uuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionID: order.sessionID || "start",
          email,
          phone,
          coupon: null,
          orderID: order.orderID,
          passangers: payloadPassengers,
          insuranceID,
          isSubscribe: subscribe,
          isSaveLogin: false,
          isConfirmPolicy: confirmPolicy,
          isConfirmPersonalData: confirmPd,
        }),
      });
      const addJson = await addRes.json();
      if (!addRes.ok) {
        setSubmitError(addJson.error ?? "Не удалось сохранить данные пассажиров.");
        return;
      }

      const buyRes = await fetch(`/api/purchase/buy?orderid=${order.orderID}`, { method: "POST" });
      const buyJson = await buyRes.json();
      if (!buyRes.ok) {
        setSubmitError(buyJson.error ?? "Не удалось перейти к оплате.");
        return;
      }
      setPayment(buyJson.data as BuyResult);
    } catch {
      setSubmitError("Сервис временно недоступен.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initError)
    return (
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
        <p className="text-[#c0392b] mb-4">{initError}</p>
        <button
          onClick={() => {
            setInitError(undefined);
            setRetry((n) => n + 1);
          }}
          className="px-5 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00]"
        >
          Попробовать снова
        </button>
      </div>
    );
  if (!order) return <p className="text-[#757575]">Готовим заказ…</p>;

  // Шаг оплаты — переход на Payler.
  if (payment) {
    // Payler может вернуть готовый URL с mdOrder/сессией в query — тогда используем как есть.
    // Иначе добавляем session-параметр из merchantSessionID.
    const payUrl =
      payment.merchantURL.includes("?") || !payment.merchantSessionID
        ? payment.merchantURL
        : `${payment.merchantURL}?session=${encodeURIComponent(payment.merchantSessionID)}`;
    return (
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
        <h1 className="font-heading font-bold text-2xl text-[#191919] mb-2">Почти готово</h1>
        <p className="text-[#757575] mb-4">
          Заказ {payment.orderName} на сумму{" "}
          <span className="font-semibold text-[#191919]">{payment.total.toLocaleString("ru-RU")} ₽</span> создан.
          Оплата проходит на защищённой странице Payler.
        </p>
        <a
          href={payUrl}
          className="inline-block px-6 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00]"
        >
          Перейти к оплате
        </a>
        <p className="text-xs text-[#757575] mt-4">
          После оплаты билет придёт на {email || "вашу почту"} и появится в разделе «Мои билеты».
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Сводка рейса */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="font-heading font-bold text-xl text-[#191919]">
            {order.depCity} → {order.arrCity}
          </h1>
          {startedAt > 0 && <Timer from={startedAt} />}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-heading font-semibold text-lg text-[#191919]">{order.depTime}</p>
            <p className="text-[#757575]">{order.depDate}</p>
            <p className="text-[#191919] mt-1">{order.depStation}</p>
          </div>
          <div className="text-right">
            <p className="font-heading font-semibold text-lg text-[#191919]">{order.arrTime}</p>
            <p className="text-[#757575]">{order.arrDate}</p>
            <p className="text-[#191919] mt-1">{order.arrStation}</p>
          </div>
        </div>
      </div>

      {/* Пассажиры */}
      {passengers.map((p, idx) => (
        <div key={idx} className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
          <h2 className="font-heading font-semibold text-lg text-[#191919] mb-4">Пассажир {idx + 1}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Фамилия" value={p.lName} onChange={(e) => updatePassenger(idx, { lName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
            <input required placeholder="Имя" value={p.fName} onChange={(e) => updatePassenger(idx, { fName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
            <input placeholder="Отчество" value={p.sName} onChange={(e) => updatePassenger(idx, { sName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
            <input required placeholder="Дата рождения ДД.ММ.ГГГГ" value={p.bDay} onChange={(e) => updatePassenger(idx, { bDay: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
            <select value={p.sex} onChange={(e) => updatePassenger(idx, { sex: e.target.value as "m" | "f" })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]">
              <option value="m">Мужской</option>
              <option value="f">Женский</option>
            </select>
            <select value={p.citizenshipISO} onChange={(e) => updatePassenger(idx, { citizenshipISO: Number(e.target.value) })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]">
              {citizenships.map((c) => (
                <option key={c.iso} value={c.iso}>{c.name}</option>
              ))}
            </select>
            <select value={p.docTypeID} onChange={(e) => updatePassenger(idx, { docTypeID: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]">
              {order.docTypes.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex flex-col gap-1">
              <input required placeholder="Номер документа" value={p.docNum} onChange={(e) => updatePassenger(idx, { docNum: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
              {docExample(order.docTypes.find((d) => d.id === p.docTypeID)?.mask) && (
                <span className="text-xs text-[#757575] px-1">Пример: {docExample(order.docTypes.find((d) => d.id === p.docTypeID)?.mask)}</span>
              )}
            </div>
            {!freeSeating && (
              <select
                required
                value={p.placeID}
                onChange={(e) => updatePassenger(idx, { placeID: e.target.value })}
                className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]"
              >
                <option value="">Выберите место</option>
                {availableSeats.map((s) => {
                  const takenByOther = passengers.some((op, oi) => oi !== idx && op.placeID === s.id);
                  return (
                    <option key={s.id} value={s.id} disabled={takenByOther}>
                      Место {s.number}
                      {s.price ? ` · ${s.price} ₽` : ""}
                      {takenByOther ? " (занято)" : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      ))}

      {/* Контакты */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
        <h2 className="font-heading font-semibold text-lg text-[#191919] mb-4">Контакты</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required type="email" placeholder="Email для билета" value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <input required type="tel" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
        </div>
      </div>

      {/* Страховка (ТЗ п.11 — отдельным блоком перед оплатой) */}
      {order.isInsurance === "Y" && order.insurance.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
          <h2 className="font-heading font-semibold text-lg text-[#191919] mb-4">Страховка</h2>
          <div className="flex flex-col gap-2">
            {order.insurance.map((ins) => (
              <label key={ins.id} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="insurance" checked={insuranceID === ins.id} onChange={() => setInsuranceID(ins.id)} />
                <span className="text-[#191919]">{ins.name}</span>
                {ins.price > 0 && <span className="text-[#757575] text-sm">+{ins.price} ₽ / пассажир</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Итог + согласия */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[#757575]">К оплате</span>
          <span className="font-heading font-bold text-2xl text-[#191919]">{total.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmPolicy} onChange={(e) => setConfirmPolicy(e.target.checked)} className="mt-1" />
            <span className="text-sm text-[#191919]">Согласен с условиями договора и правилами перевозки</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmPd} onChange={(e) => setConfirmPd(e.target.checked)} className="mt-1" />
            <span className="text-sm text-[#191919]">Согласен на обработку персональных данных (152-ФЗ)</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={subscribe} onChange={(e) => setSubscribe(e.target.checked)} className="mt-1" />
            <span className="text-sm text-[#757575]">Получать уведомления о скидках и акциях</span>
          </label>
        </div>
        {submitError && <p className="text-sm text-[#c0392b] mb-3">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-4 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00] disabled:opacity-60"
        >
          {submitting ? "Оформляем…" : "Перейти к оплате"}
        </button>
      </div>
    </form>
  );
}
