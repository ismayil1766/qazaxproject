"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "@/lib/cities";

type CategoryOpt = { key: string; value: string; label: string };

export function ListingsFiltersClient(props: {
  tab: "general" | "vehicle" | "realestate" | "phone" | "jobseekers";
  q: string;
  city: string;
  category: string;
  categoryOptions: CategoryOpt[];

  // vehicle
  make: string;
  model: string;
  makeOptions: string[];
  initialModelOptions: string[];
  yearFrom: string;
  yearTo: string;
  yearOptions: string[];

  // real estate
  propertyType: string;
  rooms: string;
  floor: string;

  // phone
  phoneBrand: string;
  phoneModel: string;
  phoneBrandOptions: string[];
  initialPhoneModelOptions: string[];
}) {
  const [tab, _setTab] = useState(props.tab);
  const [q, setQ] = useState(props.q);
  const [city, setCity] = useState(props.city);
  const [category, setCategory] = useState(props.category);

  const [make, setMake] = useState(props.make);
  const [model, setModel] = useState(props.model);
  const [modelOptionsRaw, setModelOptionsRaw] = useState<string[]>(props.initialModelOptions || []);
  const [makeOptionsRaw, setMakeOptionsRaw] = useState<string[]>(props.makeOptions || []);
  const makeOptions = useMemo(
    () => Array.from(new Set([...(makeOptionsRaw || []), make].filter(Boolean))).sort((a, b) => a.localeCompare(b, "az")),
    [makeOptionsRaw, make]
  );
  const modelOptions = useMemo(
    () => Array.from(new Set([...(modelOptionsRaw || []), model].filter(Boolean))).sort((a, b) => a.localeCompare(b, "az")),
    [modelOptionsRaw, model]
  );

  const firstModelsFetch = useRef(true);

  const [yearFrom, setYearFrom] = useState(props.yearFrom);
  const [yearTo, setYearTo] = useState(props.yearTo);

  const [propertyType, setPropertyType] = useState(props.propertyType);
  const [rooms, setRooms] = useState(props.rooms);
  const [floor, setFloor] = useState(props.floor);

  const [phoneBrand, setPhoneBrand] = useState(props.phoneBrand);
  const [phoneModel, setPhoneModel] = useState(props.phoneModel);
  const [phoneModelOptionsRaw, setPhoneModelOptionsRaw] = useState<string[]>(props.initialPhoneModelOptions || []);
  const [phoneBrandOptionsRaw, setPhoneBrandOptionsRaw] = useState<string[]>(props.phoneBrandOptions || []);
  const phoneBrandOptions = useMemo(
    () => Array.from(new Set([...(phoneBrandOptionsRaw || []), phoneBrand].filter(Boolean))).sort((a, b) => a.localeCompare(b, "az")),
    [phoneBrandOptionsRaw, phoneBrand]
  );
  const phoneModelOptions = useMemo(
    () => Array.from(new Set([...(phoneModelOptionsRaw || []), phoneModel].filter(Boolean))).sort((a, b) => a.localeCompare(b, "az")),
    [phoneModelOptionsRaw, phoneModel]
  );
  const firstPhoneModelsFetch = useRef(true);
  const firstVehicleMakesFetch = useRef(true);

  const isMoto = tab === "vehicle" && (category || "").includes("moto");

  // Load the up-to-date make/brand lists from Turbo.az / Tap.az via API.
  useEffect(() => {
    // Server-provided options can be incomplete (e.g. only a subset from DB);
    // refresh the full list once when user is on the vehicle tab.
    if (tab === "vehicle" && !isMoto && firstVehicleMakesFetch.current) {
      firstVehicleMakesFetch.current = false;
      fetch("/api/vehicles/makes")
        .then((r) => r.json())
        .then((d) => setMakeOptionsRaw(Array.isArray(d?.makes) ? d.makes : []))
        .catch(() => {});
    }
    if (tab === "phone" && phoneBrandOptions.length === 0) {
      fetch("/api/phones/brands")
        .then((r) => r.json())
        .then((d) => setPhoneBrandOptionsRaw(Array.isArray(d?.brands) ? d.brands : []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isMoto]);

  // Keep model dropdown in sync with make, without requiring a page reload.
  useEffect(() => {
    if (tab !== "vehicle") return;
    if (isMoto) {
      setMake("");
      setModel("");
      setModelOptionsRaw([]);
      return;
    }

    if (!make) {
      setModel("");
      setModelOptionsRaw([]);
      return;
    }

    // When make changes, refetch models.
    // On the first render, preserve the current model coming from URL.
    if (!firstModelsFetch.current) setModel("");

    const ctrl = new AbortController();
    fetch(`/api/vehicles/models?make=${encodeURIComponent(make)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.models) ? d.models : [];
        setModelOptionsRaw(list);
        firstModelsFetch.current = false;
      })
      .catch(() => {
        // Keep whatever we had.
        firstModelsFetch.current = false;
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make, tab, isMoto]);

  // Keep phone model dropdown in sync with brand.
  useEffect(() => {
    if (tab !== "phone") return;

    if (!phoneBrand) {
      setPhoneModel("");
      setPhoneModelOptionsRaw([]);
      return;
    }

    if (!firstPhoneModelsFetch.current) setPhoneModel("");

    const ctrl = new AbortController();
    fetch(`/api/phones/models?brand=${encodeURIComponent(phoneBrand)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.models) ? d.models : [];
        setPhoneModelOptionsRaw(list);
        firstPhoneModelsFetch.current = false;
      })
      .catch(() => {
        firstPhoneModelsFetch.current = false;
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneBrand, tab]);

  // Ensure vehicle defaults are sensible.
  useEffect(() => {
    if (tab !== "vehicle") return;
    if (!category) setCategory("avtomobil-minik");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12" action="/elanlar" method="get">
      <input type="hidden" name="tab" value={tab} />

      <input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "vehicle" ? "Axtarış (məs: Corolla, Rio...)" : tab === "phone" ? "Axtarış (məs: iPhone, Galaxy...)" : tab === "jobseekers" ? "Axtarış (məs: sürücü, satıcı, kassir...)" : "Axtarış (məs: divan, xidmət...)"}
        className="ui-input md:col-span-4"
      />

      <select name="city" value={city} onChange={(e) => setCity(e.target.value)} className="ui-input md:col-span-3">
        <option value="">Bütün şəhərlər</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="ui-input md:col-span-3"
      >
        <option value="">Bütün kateqoriyalar</option>
        {props.categoryOptions.map((o) => (
          <option key={o.key} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {tab === "vehicle" ? (
        <>
          {!isMoto ? (
            <>
              <div className="md:col-span-3">
                <select
                  name="make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="ui-input"
                >
                  <option value="">Marka (hamısı)</option>
                  {makeOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  name="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="ui-input"
                  disabled={!make}
                >
                  <option value="">{!make ? "Əvvəl marka seçin" : "Model (hamısı)"}</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="make" value="" />
              <input type="hidden" name="model" value="" />
            </>
          )}

          <select name="yearFrom" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="ui-input md:col-span-2">
            <option value="">İl (min)</option>
            {props.yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select name="yearTo" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="ui-input md:col-span-2">
            <option value="">İl (max)</option>
            {props.yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {tab === "realestate" ? (
        <>
          <select name="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="ui-input md:col-span-3">
            <option value="">Əmlak növü (hamısı)</option>
            <option value="Mənzil">Mənzil</option>
            <option value="Ev">Ev</option>
            <option value="Həyət evi">Həyət evi</option>
            <option value="Torpaq">Torpaq</option>
            <option value="Ofis">Ofis</option>
          </select>
          <select name="rooms" value={rooms} onChange={(e) => setRooms(e.target.value)} className="ui-input md:col-span-2">
            <option value="">Otaq sayı (hamısı)</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
          <select name="floor" value={floor} onChange={(e) => setFloor(e.target.value)} className="ui-input md:col-span-2">
            <option value="">Mərtəbə (hamısı)</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {tab === "phone" ? (
        <>
          <div className="md:col-span-3">
            <select
              name="phoneBrand"
              value={phoneBrand}
              onChange={(e) => setPhoneBrand(e.target.value)}
              className="ui-input"
            >
              <option value="">Marka (hamısı)</option>
              {phoneBrandOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              name="phoneModel"
              value={phoneModel}
              onChange={(e) => setPhoneModel(e.target.value)}
              className="ui-input"
              disabled={!phoneBrand}
            >
              <option value="">{!phoneBrand ? "Əvvəl marka seçin" : "Model (hamısı)"}</option>
              {phoneModelOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      <button className="ui-btn-primary px-4 py-3 md:col-span-12">Axtar</button>
    </form>
  );
}
