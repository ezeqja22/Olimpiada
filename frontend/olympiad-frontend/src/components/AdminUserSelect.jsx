import {useLanguage} from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminUserSelect({ label, role, value, onChange }) {
  const {lang}=useLanguage();
  const tr=(en,sq)=>lang==="en"?en:sq;
  const [search, setSearch] = useState(""),
    [users, setUsers] = useState([]),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    const timer = setTimeout(
      () =>
        axios
          .get(
            (process.env.REACT_APP_API_URL || "http://127.0.0.1:8000") +
              "/admin/users",
            {
              params: { search, role, limit: 100 },
              headers: {
                Authorization: "Bearer " + localStorage.getItem("token"),
              },
            },
          )
          .then((r) => {
            if (live) setUsers(r.data.users);
          })
          .catch(() => {
            if (live) setError(true);
          }),
      250,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search, role, retry]);
  return (
    <div>
      <label>
        {tr("Search","Kërko")} {label.toLowerCase()}
        <input
          className="p1-input"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange("");
          }}
        />
      </label>
      {error && (
        <p role="alert">
          {tr("Could not load accounts.","Llogaritë nuk u ngarkuan.")}{" "}
          <button type="button" onClick={() => setRetry((x) => x + 1)}>
            {tr("Retry","Provo përsëri")}
          </button>
        </p>
      )}
      <label>
        {label}
        <select
          className="p1-select"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{tr("Choose an account","Zgjidh një llogari")}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} · {user.email} (#{user.id})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
