// source/Sidebar.jsx 이식 — Keystone 좌측 내비게이션 레일.
// 프로토타입 대비 어댑테이션: navTo→라우터, PORTFOLIOS/views→DB, 전략/관점→core 프리셋(LIBRARY_LOCKED).
"use client";
import { Fragment, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  STRATEGIES, EXEC_CATS, EXEC_STRATEGIES, LIBRARY_LOCKED,
} from "@keystone/core/reference";
import { I18N } from "@keystone/core/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Lic, KeystoneLogo, PanelIcon } from "@/components/icons";
import { pfColor } from "@/lib/pf-palette";
import { OPTIONAL_DESTS, mergedKeys } from "@/lib/sidebar-config";
import { usePrefs } from "./prefs";
import { useSidebarConfig } from "./sidebar-config";

export interface SidebarPortfolio { id: string; name: string; count: number }
export interface SidebarView { id: string; name: string }

export function Sidebar({
  portfolios, plansTotal, activeCount, inboxUnread = 0, views, onWsMenu, onCollapse, onSearch,
}: {
  portfolios: SidebarPortfolio[];
  plansTotal: number;
  activeCount: number;
  inboxUnread?: number;
  views: SidebarView[];
  onWsMenu: () => void;
  onCollapse: () => void;
  onSearch?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = usePrefs();
  const { cfg, order, pinned } = useSidebarConfig();
  const t = I18N[lang];
  const view = pathname.split("/")[1] || "plans";
  const activePf = view === "plans" ? searchParams.get("pf") : null;
  const activeStrat = view === "strategy" ? pathname.split("/")[2] : null;

  const navTo = (key: string) => router.push("/" + key);
  const openStrategy = (id: string) => router.push("/strategy/" + id);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("keystone-navcollapse-v1") || "{}"); } catch { return {}; }
  });
  const toggleSec = (k: string) =>
    setCollapsed((c) => {
      const n = { ...c, [k]: !c[k] };
      try { localStorage.setItem("keystone-navcollapse-v1", JSON.stringify(n)); } catch {}
      return n;
    });
  const [menu, setMenu] = useState<{ id: string } | null>(null);

  const navItem = (key: string, icon: string, label: string, opts: {
    on?: boolean; count?: number | null; alert?: boolean; alertTitle?: string; onClick?: () => void;
  } = {}) => (
    <div className={"nav-item" + (opts.on ? " active" : "")} data-coach={key} onClick={opts.onClick}>
      <Lic name={icon} size={16} cls="icon" color="inherit" />
      <span>{label}</span>
      {opts.count != null && <span className={"count" + (opts.alert ? " unread" : "")} title={opts.alertTitle}>{opts.count}</span>}
    </div>
  );

  const Cap = ({ k, label, onAdd, first }: { k: string; label: string; onAdd?: (() => void) | null; first?: boolean }) => (
    <div className={"nav-caption nav-caption-btn" + (first ? " nav-caption--first" : "")} onClick={() => toggleSec(k)}>
      <span className="nav-cap-lab">{label}</span>
      <Lic name="chevron-right" size={12} cls={"nav-cap-chev" + (collapsed[k] ? "" : " open")} color="var(--fg-3)" />
      {onAdd && (
        <button className="nav-cap-add" title={lang === "ko" ? "추가" : "Add"} onClick={(e) => { e.stopPropagation(); onAdd(); }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 3.3V10.7M3.3 7H10.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );

  interface MenuItem { sep?: boolean; icon?: string; label?: string; danger?: boolean; run?: () => void }
  const ItemMenu = ({ id, items }: { id: string; items: MenuItem[] }) => (
    <div className="nav-item-more-wrap">
      <button className="nav-item-more" title={lang === "ko" ? "더보기" : "More"}
        onClick={(e) => { e.stopPropagation(); setMenu(menu && menu.id === id ? null : { id }); }}>
        <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="3.6" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12.4" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {menu && menu.id === id && <>
        <div className="v-menu-scrim" onClick={(e) => { e.stopPropagation(); setMenu(null); }} />
        <div className="nav-ctx v-menu" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => it.sep
            ? <div key={i} className="v-menu-sep" />
            : <div key={i} className={"v-menu-item" + (it.danger ? " danger" : "")} onClick={() => { setMenu(null); it.run?.(); }}><Lic name={it.icon!} size={14} cls="icon-sm" color="currentColor" /><span>{it.label}</span></div>)}
        </div>
      </>}
    </div>
  );

  // ---- 포트폴리오 CRUD (DB) ----
  const onNewPf = async () => {
    const v = window.prompt(lang === "ko" ? "새 포트폴리오 이름" : "New portfolio name");
    if (!v?.trim()) return;
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("portfolios").insert({ user_id: user.id, name: v.trim(), sort: portfolios.length });
    router.refresh();
  };
  const onRenamePf = async (id: string, name: string) => {
    await supabaseBrowser().from("portfolios").update({ name }).eq("id", id);
    router.refresh();
  };
  const onDelPf = async (id: string) => {
    if (!window.confirm(lang === "ko" ? "포트폴리오를 삭제할까요? (플랜은 유지됩니다)" : "Delete portfolio? (plans are kept)")) return;
    await supabaseBrowser().from("portfolios").delete().eq("id", id);
    router.refresh();
  };
  const onDelView = async (id: string) => {
    await supabaseBrowser().from("saved_views").delete().eq("id", id);
    router.refresh();
  };
  const onRenameView = async (id: string) => {
    const v = window.prompt(lang === "ko" ? "뷰 이름" : "View name");
    if (!v?.trim()) return;
    await supabaseBrowser().from("saved_views").update({ name: v.trim() }).eq("id", id);
    router.refresh();
  };

  return (
    <div className="sidebar">
      <div className="ws-row">
        <div className="ws-switch" onClick={onWsMenu}>
          <KeystoneLogo size={22} />
          <span className="ws-name">Keystone</span>
          <Lic name="chevrons-up-down" size={14} cls="ws-chev" color="var(--fg-4)" />
        </div>
        <div className="ws-actions">
          <button className="iconbtn" title={t.searchSec} onClick={onSearch}><Lic name="search" size={16} /></button>
          <button className="iconbtn" onClick={() => navTo("plans")} title={lang === "ko" ? "새 플랜" : "New plan"}><Lic name="square-pen" size={16} /></button>
          <button className="iconbtn" onClick={onCollapse} title={t.collapseSb}><PanelIcon side="left" size={16} /></button>
        </div>
      </div>

      <div className="nav">
        {navItem("inbox", "inbox", t.inbox, { on: view === "inbox", alert: inboxUnread > 0, count: inboxUnread > 0 ? inboxUnread : null, alertTitle: lang === "ko" ? inboxUnread + "개의 새 알림" : inboxUnread + " new", onClick: () => navTo("inbox") })}
        {navItem("journal", "notebook-pen", t.journal, { on: view === "journal", onClick: () => navTo("journal") })}
        {navItem("plans", "crosshair", t.home, { count: plansTotal, on: view === "plans" && !activePf, onClick: () => router.push("/plans") })}
        {/* 상단 고정된 도구 (핀) — 인박스·일지·플랜 옆 */}
        {OPTIONAL_DESTS
          .filter((d) => cfg[d.key] && pinned.includes(d.key))
          .sort((a, b) => { const ord = order || []; return ord.indexOf(a.key) - ord.indexOf(b.key); })
          .map((d) => (
            <Fragment key={d.key}>
              {navItem(d.key, d.icon, t[d.labelKey], { on: view === d.key, onClick: () => navTo(d.key) })}
            </Fragment>
          ))}

        <Cap k="pf" label={t.portfolios} onAdd={onNewPf} first />
        {!collapsed.pf && portfolios.map((pf, i) => (
          <div key={pf.id}
            className={"nav-item nav-sub nav-item-row" + (view === "plans" && activePf === pf.id ? " active" : "")}
            onClick={() => router.push("/plans?pf=" + pf.id)}>
            <span className="pf-dot" style={{ background: pfColor(i) }} />
            <span className="nav-item-lab">{pf.name}</span>
            <ItemMenu id={"pf:" + pf.id} items={[
              { icon: "filter", label: lang === "ko" ? "이 포트폴리오만 보기" : "View only this", run: () => router.push("/plans?pf=" + pf.id) },
              { icon: "pencil", label: lang === "ko" ? "이름 변경" : "Rename", run: () => { const v = window.prompt(lang === "ko" ? "포트폴리오 이름" : "Portfolio name", pf.name); if (v) void onRenamePf(pf.id, v); } },
              { sep: true },
              { icon: "trash-2", label: lang === "ko" ? "삭제" : "Delete", danger: true, run: () => void onDelPf(pf.id) },
            ]} />
            <span className="count nav-item-count">{pf.count}</span>
          </div>
        ))}

        <Cap k="strat" label={t.strategies} onAdd={LIBRARY_LOCKED ? null : undefined} />
        {!collapsed.strat && EXEC_CATS.map(({ id: cat, label: catL }) => {
          const sts = EXEC_STRATEGIES.filter((st) => (st.cat || "accum") === cat);
          if (!sts.length) return null;
          return (
            <Fragment key={cat}>
              <div className="nav-subcap">{catL[lang]}</div>
              {sts.map((st) => (
                <div key={st.id}
                  className={"nav-item nav-sub nav-item-row" + (view === "strategy" && activeStrat === st.id ? " active" : "")}
                  onClick={() => openStrategy(st.id)}>
                  <Lic name={st.icon ?? "git-branch"} size={15} cls="icon-sm" color={st.color} />
                  <span className="nav-item-lab">{st.name[lang]}</span>
                  <ItemMenu id={"st:" + st.id} items={[
                    { icon: "eye", label: lang === "ko" ? "열람" : "View", run: () => openStrategy(st.id) },
                  ]} />
                </div>
              ))}
            </Fragment>
          );
        })}

        <Cap k="frameworks" label={lang === "ko" ? "관점" : "Frameworks"} />
        {!collapsed.frameworks && ([["multiple", lang === "ko" ? "멀티플" : "Multiple"], ["intrinsic", lang === "ko" ? "내재가치" : "Intrinsic"], ["asset", lang === "ko" ? "자산" : "Asset"]] as const).map(([cat, catL]) => {
          const fws = STRATEGIES.filter((s) => s.model && (s.cat || "multiple") === cat);
          if (!fws.length) return null;
          return (
            <Fragment key={cat}>
              <div className="nav-subcap">{catL}</div>
              {fws.map((fw) => (
                <div key={fw.id}
                  className={"nav-item nav-sub nav-item-row" + (view === "strategy" && activeStrat === fw.id ? " active" : "")}
                  onClick={() => openStrategy(fw.id)}>
                  <Lic name={fw.icon || "gauge"} size={15} cls="icon-sm" color={fw.color} />
                  <span className="nav-item-lab">{fw.name[lang]}</span>
                  <ItemMenu id={"fw:" + fw.id} items={[
                    { icon: "eye", label: lang === "ko" ? "열람" : "View", run: () => openStrategy(fw.id) },
                  ]} />
                </div>
              ))}
            </Fragment>
          );
        })}

        <Cap k="views" label={t.views} />
        {!collapsed.views && views.map((v) => (
          <div key={v.id} className="nav-item nav-sub nav-item-row" onClick={() => router.push("/plans?view=" + v.id)}>
            <Lic name="layers" size={15} cls="icon-sm" color="var(--fg-3)" />
            <span className="nav-item-lab">{v.name}</span>
            <ItemMenu id={"vw:" + v.id} items={[
              { icon: "pencil", label: t.renameView, run: () => void onRenameView(v.id) },
              { sep: true },
              { icon: "trash-2", label: t.deleteView, danger: true, run: () => void onDelView(v.id) },
            ]} />
          </div>
        ))}

        {/* 도구 섹션 — 켜져 있고 상단 고정 안 된 목적지 (source Sidebar.jsx 하단 블록) */}
        {(() => {
          const ordered = mergedKeys(order)
            .map((k) => OPTIONAL_DESTS.find((d) => d.key === k))
            .filter((d): d is NonNullable<typeof d> => !!d && cfg[d.key] && !pinned.includes(d.key));
          if (!ordered.length) return null;
          return (
            <>
              <Cap k="opt" label={t.optionalDest} />
              {!collapsed.opt && ordered.map((d) => (
                <div className={"nav-item" + (view === d.key ? " active" : "")} key={d.key} onClick={() => navTo(d.key)}>
                  <Lic name={d.icon} size={16} cls="icon" color="inherit" /><span>{t[d.labelKey]}</span>
                </div>
              ))}
            </>
          );
        })()}
      </div>
    </div>
  );
}
