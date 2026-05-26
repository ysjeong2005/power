import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleCheck, GripVertical, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, PieChart, Plus, ReceiptText, RefreshCw, Settings, Wallet, X } from 'lucide-react';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const BUDGET_SIMPLE_VIEW_KEY = 'power.budget.simpleView';
const DEFAULT_SETTINGS = { darkMode: false, defaultPage: 'checklist' };
const START_PAGE_OPTIONS = [
  { value: 'checklist', label: '체크리스트' },
  { value: 'personnel', label: '인원관리' },
  { value: 'budget', label: '예산관리' },
  { value: 'weddingHall', label: '웨딩홀' },
  { value: 'sdm', label: '스드메' },
  { value: 'home', label: '보금자리' },
  { value: 'settings', label: '설정' }
];

function normalizeSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
    defaultPage: START_PAGE_OPTIONS.some((option) => option.value === settings?.defaultPage) ? settings.defaultPage : DEFAULT_SETTINGS.defaultPage
  };
}

function currency(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

function normalizePasteHeader(value) {
  return (value ?? '').replace(/\s/g, '').toLowerCase();
}

function parsePastedTable(text, knownHeaders) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { lines: [], hasHeader: false, headerMap: new Map() };
  }
  const firstValues = lines[0].split('\t');
  const normalizedKnownHeaders = knownHeaders.map(normalizePasteHeader);
  const headerMatchCount = firstValues.filter((value) => normalizedKnownHeaders.includes(normalizePasteHeader(value))).length;
  const hasHeader = headerMatchCount >= 2;
  const headerMap = new Map();
  if (hasHeader) {
    firstValues.forEach((value, index) => headerMap.set(normalizePasteHeader(value), index));
  }
  return { lines: hasHeader ? lines.slice(1) : lines, hasHeader, headerMap };
}

function pastedValue(values, headerMap, names, fallbackIndex) {
  const foundIndex = names.map(normalizePasteHeader).map((name) => headerMap.get(name)).find((index) => index !== undefined);
  return values[foundIndex ?? fallbackIndex] ?? '';
}

function parseAmount(value) {
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  return normalized ? Number(normalized) : 0;
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['y', 'yes', 'o', 'true', '1', '완료', '있음', '예', '청첩장'].includes(normalized);
}

function makeNewId(prefix = 'new') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function createExcelDownload({ sheetName, sheets, filenamePrefix }) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Power';
  workbook.created = new Date();
  const workbookSheets = sheets ?? [sheetName];

  workbookSheets.forEach((sheetConfig) => {
    const worksheet = workbook.addWorksheet(sheetConfig.name);
    worksheet.columns = sheetConfig.columns;
    worksheet.addRows(sheetConfig.rows);
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columns.length }
    };
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4EF' } };
      cell.font = { bold: true, color: { argb: 'FF1D6F62' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD7DFDA' } } };
    });
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE4EBE7' } },
          left: { style: 'thin', color: { argb: 'FFE4EBE7' } },
          bottom: { style: 'thin', color: { argb: 'FFE4EBE7' } },
          right: { style: 'thin', color: { argb: 'FFE4EBE7' } }
        };
      });
    });
    sheetConfig.columns.forEach((column) => {
      if (column.numFmt) {
        worksheet.getColumn(column.key).numFmt = column.numFmt;
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${filenamePrefix}_${today}.xlsx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return { url, filename };
}

function useExcelDownloadLink() {
  const [download, setDownload] = useState(null);
  useEffect(() => {
    return () => {
      if (download?.url) URL.revokeObjectURL(download.url);
    };
  }, [download]);

  function keepDownload(nextDownload) {
    setDownload((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return nextDownload;
    });
  }

  return [download, keepDownload];
}

function DownloadNotice({ message, download }) {
  if (!message) return null;
  return (
    <p className="saved-notice">
      {message}
      {download && (
        <a className="download-link" href={download.url} download={download.filename}>
          파일 받기
        </a>
      )}
    </p>
  );
}

function PasteModal({ title, guide, example, value, message, onChange, onClose, onApply }) {
  return (
    <div className="modal-backdrop">
      <section className="category-modal paste-modal">
        <div className="modal-title-row">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <p>엑셀에서 아래 순서로 복사한 뒤 붙여넣으세요. 헤더가 포함되어 있어도 처리됩니다.</p>
        <code>{guide}</code>
        <textarea
          className="paste-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={example}
          autoFocus
        />
        {message && <p className="category-message paste-message">{message}</p>}
        <div className="paste-actions">
          <button className="modal-save" type="button" onClick={onApply}>신규 로우 추가</button>
        </div>
      </section>
    </div>
  );
}

function PrettyCheckbox({ checked, onChange, label, tone = 'default' }) {
  return (
    <label className={`pretty-check ${tone}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" />
      {label && <em>{label}</em>}
    </label>
  );
}

function Sidebar({ activePage, onNavigate, user, onLogout, collapsed, onToggleCollapse }) {
  return (
    <aside className={`side-nav ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <div className="sidebar-top">
          <div className="brand-mark">{collapsed ? 'P' : 'Power'}</div>
          <button className="sidebar-toggle" type="button" onClick={onToggleCollapse} aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <div className="mobile-session">
            <strong>{user?.nickname ?? user?.id}</strong>
            <button type="button" onClick={onLogout} aria-label="로그아웃">
              <LogOut size={17} />
            </button>
          </div>
        </div>
        <nav>
          <button className={activePage === 'checklist' ? 'active' : ''} type="button" onClick={() => onNavigate('checklist')} title="체크리스트">
            <span>체크리스트</span>
          </button>
          <button className={activePage === 'personnel' ? 'active' : ''} type="button" onClick={() => onNavigate('personnel')} title="인원관리">
            <span>인원관리</span>
          </button>
          <button className={activePage === 'budget' ? 'active' : ''} type="button" onClick={() => onNavigate('budget')} title="예산관리">
            <span>예산관리</span>
          </button>
          <button className={activePage === 'weddingHall' ? 'active' : ''} type="button" onClick={() => onNavigate('weddingHall')} title="웨딩홀">
            <span>웨딩홀</span>
          </button>
          <button className={activePage === 'sdm' ? 'active' : ''} type="button" onClick={() => onNavigate('sdm')} title="스드메">
            <span>스드메</span>
          </button>
          <button className={activePage === 'home' ? 'active' : ''} type="button" onClick={() => onNavigate('home')} title="보금자리">
            <span>보금자리</span>
          </button>
          <button className={activePage === 'settings' ? 'active' : ''} type="button" onClick={() => onNavigate('settings')} title="설정">
            <span>설정</span>
          </button>
        </nav>
      </div>
      <div className="sidebar-session">
        <button type="button" onClick={onLogout} title="로그아웃">
          <LogOut size={15} />
          <span>로그아웃</span>
        </button>
        <strong title={user?.nickname ?? user?.id}>{user?.nickname ?? user?.id}</strong>
      </div>
    </aside>
  );
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ id: '', pw: '' });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const text = await response.text();
      if (!response.ok) {
        let errorMessage = '로그인에 실패했습니다.';
        if (text) {
          try {
            errorMessage = JSON.parse(text).message ?? errorMessage;
          } catch {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }
      onLogin(text ? JSON.parse(text) : null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">Power</div>
        <h1>로그인</h1>
        <form onSubmit={submitLogin}>
          <label>
            <span>아이디</span>
            <input
              value={form.id}
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
              placeholder="아이디"
              autoFocus
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              type="password"
              value={form.pw}
              onChange={(event) => setForm((current) => ({ ...current, pw: event.target.value }))}
              placeholder="비밀번호"
            />
          </label>
          {message && <p className="message">{message}</p>}
          <button className="login-button" type="submit" disabled={isSubmitting}>
            로그인
          </button>
        </form>
        <p>계정은 회원가입 없이 DB의 users 테이블에 등록해서 사용합니다.</p>
        <code>users(id, pw, personalId)</code>
      </section>
    </main>
  );
}

function PersonnelPage() {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ major: '', minor: '', name: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState({ major: '', minor: '', percent: 80 });
  const [message, setMessage] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [categoryNotice, setCategoryNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [dirtyRowIds, setDirtyRowIds] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useState(null);

  const majors = useMemo(() => [...new Set(categories.map((category) => category.major))], [categories]);
  const filteredMinorOptions = useMemo(() => {
    return categories.filter((category) => !filters.major || category.major === filters.major);
  }, [categories, filters.major]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const category = categories.find((item) => item.id === row.categoryId);
      if (!category) return false;
      return (!filters.major || category.major === filters.major)
        && (!filters.minor || category.minor === filters.minor)
        && (!filters.name || row.name.includes(filters.name));
    });
  }, [categories, filters, rows]);

  const groupedRows = useMemo(() => {
    const groups = new Map();
    visibleRows.filter((row) => !row.isNew).forEach((row) => {
      const category = categories.find((item) => item.id === row.categoryId);
      const key = row.categoryId;
      if (!groups.has(key)) {
        groups.set(key, { category, rows: [] });
      }
      groups.get(key).rows.push(row);
    });
    return Array.from(groups.values());
  }, [categories, visibleRows]);

  const newRows = useMemo(() => visibleRows.filter((row) => row.isNew), [visibleRows]);
  const visibleRowIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
  const isAllVisibleSelected = visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedRowIds.includes(id));
  const pendingNewCount = rows.filter((row) => row.isNew).length;
  const pendingEditCount = dirtyRowIds.length;
  const hasPendingChanges = pendingNewCount > 0 || pendingEditCount > 0;
  const pendingText = [
    pendingNewCount > 0 ? `신규 ${pendingNewCount}건` : '',
    pendingEditCount > 0 ? `수정 ${pendingEditCount}건` : ''
  ].filter(Boolean).join(', ') || '저장 전 변경 없음';

  const grandTotal = useMemo(() => {
    return groupedRows.reduce((acc, group) => {
      acc.people += group.rows.length;
      acc.applied += Math.round(group.rows.length * group.category.percent / 100);
      acc.amount += group.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return acc;
    }, { people: 0, applied: 0, amount: 0 });
  }, [groupedRows]);

  useEffect(() => {
    return () => {
      if (excelDownload?.url) {
        URL.revokeObjectURL(excelDownload.url);
      }
    };
  }, [excelDownload]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options
    });

    const text = await response.text();

    if (!response.ok) {
      let errorMessage = '요청 처리에 실패했습니다.';
      if (text) {
        try {
          errorMessage = JSON.parse(text).message ?? errorMessage;
        } catch {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null;
    }

    return text ? JSON.parse(text) : null;
  }

  async function loadData() {
    setIsLoading(true);
    setMessage('');

    try {
      const data = await api('/api/personnel');
      setCategories(data.categories ?? []);
      setRows(data.people ?? []);
      setDirtyRowIds([]);
      setEditingCell(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'major' ? { minor: '' } : {})
    }));
  }

  function addRow() {
    if (categories.length === 0) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }

    setSavedNotice('');
    setRows((current) => [
      { id: `new-${Date.now()}`, categoryId: categories[0].id, relation: '', name: '', amount: 0, invitation: false, memo: '', isNew: true },
      ...current
    ]);
  }

  function openPasteModal() {
    if (categories.length === 0) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }
    setPasteText('');
    setPasteMessage('');
    setIsPasteModalOpen(true);
  }

  function normalizePasteHeader(value) {
    return (value ?? '').replace(/\s/g, '').toLowerCase();
  }

  function parseAmount(value) {
    const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
    return normalized ? Number(normalized) : 0;
  }

  function parseInvitation(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return ['y', 'yes', 'o', 'true', '1', '청첩장', '있음', '예'].includes(normalized);
  }

  function findCategoryByNames(major, minor) {
    const nextMajor = String(major ?? '').trim();
    const nextMinor = String(minor ?? '').trim();
    return categories.find((category) => category.major === nextMajor && category.minor === nextMinor);
  }

  function rowValueByHeader(values, headerMap, names, fallbackIndex) {
    const foundIndex = names.map(normalizePasteHeader).map((name) => headerMap.get(name)).find((index) => index !== undefined);
    return values[foundIndex ?? fallbackIndex] ?? '';
  }

  function applyPastedRows() {
    const lines = pasteText
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.');
      return;
    }

    const firstValues = lines[0].split('\t');
    const knownHeaders = ['대분류', '소분류', '성명', '대상자와관계', '관계', '금액', '청첩장', '메모'];
    const headerMatchCount = firstValues.filter((value) => knownHeaders.includes(normalizePasteHeader(value))).length;
    const hasHeader = headerMatchCount >= 2;
    const headerMap = new Map();
    if (hasHeader) {
      firstValues.forEach((value, index) => headerMap.set(normalizePasteHeader(value), index));
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const nextRows = [];
    const errors = [];

    dataLines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const major = rowValueByHeader(values, headerMap, ['대분류'], 0);
      const minor = rowValueByHeader(values, headerMap, ['소분류'], 1);
      const category = findCategoryByNames(major, minor);
      if (!category) {
        errors.push(`${rowNumber}행: ${major || '-'} / ${minor || '-'} 분류가 없습니다.`);
        return;
      }
      const name = rowValueByHeader(values, headerMap, ['성명', '이름'], 2);
      if (!String(name).trim()) {
        errors.push(`${rowNumber}행: 성명이 비어 있습니다.`);
        return;
      }
      nextRows.push({
        id: `new-${Date.now()}-${index}`,
        categoryId: category.id,
        name: String(name).trim(),
        relation: String(rowValueByHeader(values, headerMap, ['대상자와관계', '관계'], 3)).trim(),
        amount: parseAmount(rowValueByHeader(values, headerMap, ['금액'], 4)),
        invitation: parseInvitation(rowValueByHeader(values, headerMap, ['청첩장'], 5)),
        memo: String(rowValueByHeader(values, headerMap, ['메모'], 6)).trim(),
        isNew: true
      });
    });

    if (errors.length > 0) {
      setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''));
      return;
    }

    if (nextRows.length === 0) {
      setPasteMessage('추가할 대상자가 없습니다.');
      return;
    }

    setRows((current) => [...nextRows, ...current]);
    setSavedNotice(`엑셀 붙여넣기로 신규 ${nextRows.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setPasteText('');
    setPasteMessage('');
    setIsPasteModalOpen(false);
  }

  async function downloadPersonnelExcel() {
    const exportRows = visibleRows
      .map((row) => {
        const category = categories.find((item) => item.id === row.categoryId);
        if (!category) return null;
        const peopleCount = visibleRows.filter((item) => item.categoryId === row.categoryId).length;
        return {
          major: category.major,
          minor: category.minor,
          percent: category.percent,
          name: row.name,
          relation: row.relation,
          amount: Number(row.amount || 0),
          invitation: row.invitation ? 'Y' : 'N',
          memo: row.memo ?? '',
          peopleCount,
          appliedCount: Math.round(peopleCount * category.percent / 100)
        };
      })
      .filter(Boolean);

    if (exportRows.length === 0) {
      setSavedNotice('다운로드할 인원관리 데이터가 없습니다.');
      return;
    }

    setMessage('');
    setSavedNotice('엑셀 파일을 생성하고 있습니다.');

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Power';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('인원관리');
      worksheet.columns = [
        { header: '대분류', key: 'major', width: 16 },
        { header: '소분류', key: 'minor', width: 16 },
        { header: '퍼센티지', key: 'percent', width: 12 },
        { header: '성명', key: 'name', width: 16 },
        { header: '대상자와 관계', key: 'relation', width: 18 },
        { header: '금액', key: 'amount', width: 14 },
        { header: '청첩장', key: 'invitation', width: 10 },
        { header: '메모', key: 'memo', width: 32 },
        { header: '대상자 수', key: 'peopleCount', width: 12 },
        { header: '적용 수', key: 'appliedCount', width: 12 }
      ];
      worksheet.addRows(exportRows);
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length }
      };
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4EF' } };
        cell.font = { bold: true, color: { argb: 'FF1D6F62' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFD7DFDA' } } };
      });
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE4EBE7' } },
            left: { style: 'thin', color: { argb: 'FFE4EBE7' } },
            bottom: { style: 'thin', color: { argb: 'FFE4EBE7' } },
            right: { style: 'thin', color: { argb: 'FFE4EBE7' } }
          };
          if (rowNumber > 1 && [3, 9, 10].includes(cell.col)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8F7' } };
          }
        });
      });
      worksheet.getColumn('percent').numFmt = '0"%"';
      worksheet.getColumn('amount').numFmt = '#,##0"원"';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `power_인원관리_${today}.xlsx`;

      setExcelDownload((current) => {
        if (current?.url) {
          URL.revokeObjectURL(current.url);
        }
        return { url, filename };
      });

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSavedNotice(`${exportRows.length}건의 인원관리 엑셀 파일을 생성했습니다.`);
    } catch (error) {
      setSavedNotice('');
      setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
    }
  }

  function updateRow(rowId, field, value) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
    if (typeof rowId === 'number') {
      setDirtyRowIds((current) => current.includes(rowId) ? current : [...current, rowId]);
    }
  }

  function updateGroupCategory(groupRows, categoryId) {
    const nextCategoryId = Number(categoryId);
    const nextRows = groupRows.map((row) => ({ ...row, categoryId: nextCategoryId }));
    setRows((current) => current.map((row) => nextRows.find((next) => next.id === row.id) ?? row));
    setDirtyRowIds((current) => [
      ...current,
      ...nextRows.filter((row) => !row.isNew && !current.includes(row.id)).map((row) => row.id)
    ]);
  }

  function updateNewRowMajor(row, major) {
    const nextCategory = categories.find((category) => category.major === major);
    if (nextCategory) {
      updateRow(row.id, 'categoryId', nextCategory.id);
    }
  }

  function isEditing(rowId, field) {
    return editingCell?.rowId === rowId && editingCell?.field === field;
  }

  function startEditing(rowId, field) {
    setEditingCell({ rowId, field });
  }

  function finishEditing() {
    setEditingCell(null);
  }

  function isEditingCategoryGroup(groupRows) {
    return groupRows.some((row) => isEditing(row.id, 'major') || isEditing(row.id, 'minor'));
  }

  function updatePersistedRowMajor(row, major) {
    const nextCategory = categories.find((category) => category.major === major);
    if (nextCategory) {
      updateRow(row.id, 'categoryId', nextCategory.id);
      setEditingCell(null);
    }
  }

  function updatePersistedRowCategory(row, categoryId) {
    updateRow(row.id, 'categoryId', Number(categoryId));
    setEditingCell(null);
  }

  async function saveRows() {
    const newRows = rows.filter((row) => row.isNew);
    const dirtyRows = rows.filter((row) => !row.isNew && dirtyRowIds.includes(row.id));
    if (newRows.length === 0 && dirtyRows.length === 0) {
      setSavedNotice('저장할 변경사항이 없습니다.');
      return;
    }

    setMessage('');
    setSavedNotice('');

    try {
      const createdRows = await Promise.all(newRows.map((row) => api('/api/personnel/people', {
        method: 'POST',
        body: JSON.stringify(row)
      })));
      const updatedRows = await Promise.all(dirtyRows.map((row) => api(`/api/personnel/people/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify(row)
      })));
      setRows((current) => {
        const createdQueue = [...createdRows];
        return current.map((row) => {
          const updated = updatedRows.find((item) => item.id === row.id);
          if (updated) return updated;
          if (!row.isNew) return row;
          return createdQueue.shift();
        });
      });
      setDirtyRowIds([]);
      setEditingCell(null);
      setSavedNotice(`${createdRows.length + updatedRows.length}개 행을 저장했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function toggleRowSelection(rowId, checked) {
    setSelectedRowIds((current) => (
      checked ? [...current, rowId] : current.filter((id) => id !== rowId)
    ));
  }

  function toggleAllVisibleRows(checked) {
    setSelectedRowIds((current) => {
      const hiddenSelectedIds = current.filter((id) => !visibleRowIds.includes(id));
      return checked ? [...hiddenSelectedIds, ...visibleRowIds] : hiddenSelectedIds;
    });
  }

  async function deleteSelectedRows() {
    if (selectedRowIds.length === 0) {
      setSavedNotice('삭제할 대상자를 선택하세요.');
      return;
    }

    const persistedIds = selectedRowIds.filter((id) => typeof id === 'number');
    setMessage('');
    setSavedNotice('');

    try {
      if (persistedIds.length > 0) {
        await api('/api/personnel/people', {
          method: 'DELETE',
          body: JSON.stringify(persistedIds)
        });
      }

      setRows((current) => current.filter((row) => !selectedRowIds.includes(row.id)));
      setSelectedRowIds([]);
      setDirtyRowIds((current) => current.filter((id) => !selectedRowIds.includes(id)));
      setSavedNotice(`${selectedRowIds.length}명 삭제했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    const major = draftCategory.major.trim();
    const minor = draftCategory.minor.trim();
    if (!major || !minor) {
      setCategoryMessage('대분류와 소분류를 입력하세요.');
      setCategoryNotice('');
      return;
    }
    setCategoryMessage('');
    setCategoryNotice('');

    try {
      const created = await api('/api/personnel/categories', {
        method: 'POST',
        body: JSON.stringify({ major, minor, percent: Number(draftCategory.percent || 0) })
      });
      setCategories((current) => [...current, created]);
      setDraftCategory({ major: '', minor: '', percent: 80 });
      setCategoryNotice('분류를 추가했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
    }
  }

  function updateCategoryLocal(categoryId, field, value) {
    setCategories((current) => current.map((category) => (
      category.id === categoryId ? { ...category, [field]: value } : category
    )));
  }

  async function updateCategory(category) {
    setCategoryMessage('');
    setCategoryNotice('');

    try {
      const saved = await api(`/api/personnel/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          major: category.major,
          minor: category.minor,
          percent: Number(category.percent || 0)
        })
      });
      setCategories((current) => current.map((item) => item.id === saved.id ? saved : item));
      setCategoryNotice('분류를 저장했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadData();
    }
  }

  async function deleteCategory(category) {
    if (rows.some((row) => row.categoryId === category.id)) {
      setCategoryMessage('이미 사용 중인 분류는 삭제할 수 없습니다.');
      setCategoryNotice('');
      return;
    }

    if (!window.confirm(`${category.major} / ${category.minor} 분류를 삭제할까요?`)) {
      return;
    }

    setCategoryMessage('');
    setCategoryNotice('');

    try {
      await api(`/api/personnel/categories/${category.id}`, { method: 'DELETE' });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setCategoryNotice('분류를 삭제했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadData();
    }
  }

  function openCategoryModal() {
    setCategoryMessage('');
    setCategoryNotice('');
    setIsModalOpen(true);
  }

  function minorOptionsForMajor(major) {
    return categories.filter((category) => category.major === major);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
      <main className="app-shell wide-shell">
        <section className="hero compact-hero">
          <div>
            <p className="eyebrow">Power 프로젝트</p>
            <h1>인원관리</h1>
            <p className="summary">대분류와 소분류 기준으로 대상자를 입력하고 적용 인원을 자동 계산합니다.</p>
          </div>
          <button className="icon-button" type="button" onClick={loadData} disabled={isLoading} aria-label="새로고침">
            <RefreshCw size={18} />
          </button>
        </section>

        <button className="filter-toggle" type="button" onClick={() => setIsFilterOpen((current) => !current)}>
          {isFilterOpen ? '필터 접기' : '필터 펼치기'}
        </button>

        <section className={`filter-strip ${isFilterOpen ? 'open' : 'collapsed'}`}>
          <label>
            <span>대분류</span>
            <select value={filters.major} onChange={(event) => updateFilter('major', event.target.value)}>
              <option value="">전체</option>
              {majors.map((major) => <option key={major} value={major}>{major}</option>)}
            </select>
          </label>
          <label>
            <span>소분류</span>
            <select value={filters.minor} onChange={(event) => updateFilter('minor', event.target.value)}>
              <option value="">전체</option>
              {filteredMinorOptions.map((category) => (
                <option key={category.id} value={category.minor}>{category.minor}</option>
              ))}
            </select>
          </label>
          <label>
            <span>성명</span>
            <input value={filters.name} onChange={(event) => updateFilter('name', event.target.value)} placeholder="이름 검색" />
          </label>
          <button className="filter-search" type="button" onClick={loadData} disabled={isLoading}>조회</button>
        </section>

        {message && <p className="message">{message}</p>}
        {savedNotice && (
          <p className="saved-notice">
            {savedNotice}
            {excelDownload && (
              <a className="download-link" href={excelDownload.url} download={excelDownload.filename}>
                파일 받기
              </a>
            )}
          </p>
        )}
        <section className="table-panel">
          <div className="table-toolbar">
            <span className={`pending-inline ${hasPendingChanges ? 'active' : ''}`}>
              {pendingText}
            </span>
            <div className="table-toolbar-actions">
              <button className="small-action category-manage-button" type="button" onClick={openCategoryModal}>
                <Settings size={14} /> 분류 관리
              </button>
              <button className="small-action" type="button" onClick={addRow}>
                <Plus size={14} /> 행 추가
              </button>
              <button className="small-action" type="button" onClick={openPasteModal}>
                엑셀 붙여넣기
              </button>
              <button className="small-action" type="button" onClick={downloadPersonnelExcel}>
                엑셀 다운로드
              </button>
              <button className="small-delete" type="button" onClick={deleteSelectedRows}>
                삭제
              </button>
              <button className={`small-save ${hasPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveRows}>
                저장
              </button>
            </div>
          </div>

          <div className="grid-table-wrap">
            <table className="people-table">
              <thead>
                <tr>
                  <th className="check-column">
                    <PrettyCheckbox
                      checked={isAllVisibleSelected}
                      onChange={toggleAllVisibleRows}
                      tone="danger"
                    />
                  </th>
                  <th>대분류</th>
                  <th>소분류</th>
                  <th>퍼센티지</th>
                  <th>성명</th>
                  <th>대상자와 관계</th>
                  <th>금액</th>
                  <th>청첩장</th>
                  <th>메모</th>
                  <th>대상자 수</th>
                  <th>적용 수</th>
                  <th className="total-head">합계</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.length === 0 && newRows.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan="12">
                      <strong>표시할 데이터가 없습니다.</strong>
                      <span>먼저 분류 관리에서 대분류와 소분류를 추가한 뒤 행을 입력하세요.</span>
                    </td>
                  </tr>
                )}
                {newRows.map((row) => {
                  const category = categories.find((item) => item.id === row.categoryId);
                  const minorOptions = category ? minorOptionsForMajor(category.major) : categories;

                  return (
                    <tr key={row.id} className="new-row">
                      <td className="check-column">
                        <PrettyCheckbox
                          checked={selectedRowIds.includes(row.id)}
                          onChange={(checked) => toggleRowSelection(row.id, checked)}
                          tone="danger"
                        />
                      </td>
                      <td className="major-cell">
                        <select value={category?.major ?? ''} onChange={(event) => updateNewRowMajor(row, event.target.value)}>
                          {majors.map((major) => <option key={major} value={major}>{major}</option>)}
                        </select>
                      </td>
                      <td className="minor-cell">
                        <select value={row.categoryId} onChange={(event) => updateRow(row.id, 'categoryId', Number(event.target.value))}>
                          {minorOptions.map((item) => (
                            <option key={item.id} value={item.id}>{item.minor}</option>
                          ))}
                        </select>
                      </td>
                      <td className="readonly-metric">{category?.percent ?? 0}%</td>
                      <td className="check-column">
                        <input
                          value={row.name}
                          onChange={(event) => updateRow(row.id, 'name', event.target.value)}
                          placeholder="성명"
                        />
                      </td>
                      <td className="check-column">
                        <input
                          value={row.relation}
                          onChange={(event) => updateRow(row.id, 'relation', event.target.value)}
                          placeholder="관계"
                        />
                      </td>
                      <td className="check-column">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(event) => updateRow(row.id, 'amount', event.target.value)}
                        />
                      </td>
                      <td>
                        <PrettyCheckbox
                          checked={row.invitation}
                          onChange={(checked) => updateRow(row.id, 'invitation', checked)}
                        />
                      </td>
                      <td>
                        <input
                          value={row.memo ?? ''}
                          onChange={(event) => updateRow(row.id, 'memo', event.target.value)}
                          placeholder="메모"
                        />
                      </td>
                      <td className="pending-metric">-</td>
                      <td className="pending-metric">-</td>
                      <td className="pending-metric total-cell">-</td>
                    </tr>
                  );
                })}
                {groupedRows.map((group) => {
                  const peopleCount = group.rows.length;
                  const appliedCount = Math.round(peopleCount * group.category.percent / 100);
                  const majorOptions = majors;
                  const minorOptions = minorOptionsForMajor(group.category.major);
                  const isCategoryGroupEditing = isEditingCategoryGroup(group.rows);

                  return group.rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        <PrettyCheckbox
                          checked={selectedRowIds.includes(row.id)}
                          onChange={(checked) => toggleRowSelection(row.id, checked)}
                          tone="danger"
                        />
                      </td>
                      {isCategoryGroupEditing ? (
                        <>
                          <td className="major-cell">
                            {isEditing(row.id, 'major') ? (
                              <select
                                autoFocus
                                value={categories.find((category) => category.id === row.categoryId)?.major ?? ''}
                                onBlur={() => setEditingCell(null)}
                                onChange={(event) => updatePersistedRowMajor(row, event.target.value)}
                              >
                                {majorOptions.map((major) => <option key={major} value={major}>{major}</option>)}
                              </select>
                            ) : (
                              <span className="read-text" onDoubleClick={() => startEditing(row.id, 'major')}>
                                {categories.find((category) => category.id === row.categoryId)?.major ?? '-'}
                              </span>
                            )}
                          </td>
                          <td className="minor-cell">
                            {isEditing(row.id, 'minor') ? (
                              <select
                                autoFocus
                                value={row.categoryId}
                                onBlur={() => setEditingCell(null)}
                                onChange={(event) => updatePersistedRowCategory(row, event.target.value)}
                              >
                                {minorOptionsForMajor(categories.find((category) => category.id === row.categoryId)?.major ?? '').map((category) => (
                                  <option key={category.id} value={category.id}>{category.minor}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="read-text" onDoubleClick={() => startEditing(row.id, 'minor')}>
                                {categories.find((category) => category.id === row.categoryId)?.minor ?? '-'}
                              </span>
                            )}
                          </td>
                          <td className="readonly-metric">{categories.find((category) => category.id === row.categoryId)?.percent ?? 0}%</td>
                        </>
                      ) : (
                        <>
                          {index === 0 && (
                            <td className="merged major-cell" rowSpan={peopleCount}>
                              <span className="read-text" onDoubleClick={() => startEditing(row.id, 'major')}>{group.category.major}</span>
                            </td>
                          )}
                          {index === 0 && (
                            <td className="merged minor-cell" rowSpan={peopleCount}>
                              <span className="read-text" onDoubleClick={() => startEditing(row.id, 'minor')}>{group.category.minor}</span>
                            </td>
                          )}
                          {index === 0 && (
                            <td className="merged readonly-metric" rowSpan={peopleCount}>{group.category.percent}%</td>
                          )}
                        </>
                      )}
                      <td>
                        {isEditing(row.id, 'name') ? (
                          <input
                            autoFocus
                            value={row.name}
                            onBlur={finishEditing}
                            onChange={(event) => updateRow(row.id, 'name', event.target.value)}
                            placeholder="성명"
                          />
                        ) : (
                          <span className="read-text" onDoubleClick={() => startEditing(row.id, 'name')}>{row.name || '-'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing(row.id, 'relation') ? (
                          <input
                            autoFocus
                            value={row.relation}
                            onBlur={finishEditing}
                            onChange={(event) => updateRow(row.id, 'relation', event.target.value)}
                            placeholder="관계"
                          />
                        ) : (
                          <span className="read-text" onDoubleClick={() => startEditing(row.id, 'relation')}>{row.relation || '-'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing(row.id, 'amount') ? (
                          <input
                            autoFocus
                            type="number"
                            value={row.amount}
                            onBlur={finishEditing}
                            onChange={(event) => updateRow(row.id, 'amount', event.target.value)}
                          />
                        ) : (
                          <span className="read-text" onDoubleClick={() => startEditing(row.id, 'amount')}>{currency(row.amount)}</span>
                        )}
                      </td>
                      <td>
                        {isEditing(row.id, 'invitation') ? (
                          <PrettyCheckbox
                            checked={row.invitation}
                            onChange={(checked) => {
                              updateRow(row.id, 'invitation', checked);
                              setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className="read-text" onDoubleClick={() => startEditing(row.id, 'invitation')}>{row.invitation ? 'O' : '-'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing(row.id, 'memo') ? (
                          <input
                            autoFocus
                            value={row.memo ?? ''}
                            onBlur={finishEditing}
                            onChange={(event) => updateRow(row.id, 'memo', event.target.value)}
                            placeholder="메모"
                          />
                        ) : (
                          <span className="read-text memo-text" onDoubleClick={() => startEditing(row.id, 'memo')}>{row.memo || '-'}</span>
                        )}
                      </td>
                      {index === 0 && <td className="merged readonly-metric" rowSpan={peopleCount}>{peopleCount}명</td>}
                      {index === 0 && <td className="merged readonly-metric" rowSpan={peopleCount}>{appliedCount}명</td>}
                      {index === 0 && (
                        <td className="merged total-cell" rowSpan={peopleCount}>
                          <strong>{appliedCount}명</strong>
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
        </div>
        <div className="summary-footer">
          <span>전체 대상자 {grandTotal.people}명</span>
          <strong>적용 {grandTotal.applied}명</strong>
          <strong>전체 금액 {currency(grandTotal.amount)}</strong>
        </div>
      </section>

        {isModalOpen && (
          <div className="modal-backdrop">
            <section className="category-modal">
              <div className="modal-title-row">
                <h2>분류 관리</h2>
                <button className="icon-button" type="button" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                  <X size={18} />
                </button>
              </div>

              <form className="category-form" onSubmit={saveCategory}>
                <label>
                  <span>대분류</span>
                  <input value={draftCategory.major} onChange={(event) => setDraftCategory((current) => ({ ...current, major: event.target.value }))} placeholder="예: 가족" />
                </label>
                <label>
                  <span>소분류</span>
                  <input value={draftCategory.minor} onChange={(event) => setDraftCategory((current) => ({ ...current, minor: event.target.value }))} placeholder="예: 직계" />
                </label>
                <label>
                  <span>퍼센티지</span>
                  <input type="number" min="0" max="100" value={draftCategory.percent} onChange={(event) => setDraftCategory((current) => ({ ...current, percent: event.target.value }))} />
                </label>
                <button className="modal-save" type="submit">추가</button>
              </form>

              {categoryMessage && <p className="category-message">{categoryMessage}</p>}
              {categoryNotice && <p className="category-notice">{categoryNotice}</p>}

              <div className="category-list">
                {categories.length === 0 ? (
                  <p>등록된 분류가 없습니다.</p>
                ) : categories.map((category) => (
                  <div className="category-edit-row" key={category.id}>
                    <input value={category.major} onChange={(event) => updateCategoryLocal(category.id, 'major', event.target.value)} />
                    <input value={category.minor} onChange={(event) => updateCategoryLocal(category.id, 'minor', event.target.value)} />
                    <input type="number" min="0" max="100" value={category.percent} onChange={(event) => updateCategoryLocal(category.id, 'percent', event.target.value)} />
                    <button type="button" onClick={() => updateCategory(category)}>저장</button>
                    <button className="category-delete-button" type="button" onClick={() => deleteCategory(category)}>삭제</button>
                  </div>
                ))}
              </div>
              <p>테이블에서는 퍼센티지를 직접 수정하지 않고, 선택된 소분류 기준으로 자동 표시됩니다.</p>
            </section>
          </div>
        )}
        {isPasteModalOpen && (
          <div className="modal-backdrop">
            <section className="category-modal paste-modal">
              <div className="modal-title-row">
                <h2>엑셀 붙여넣기</h2>
                <button className="icon-button" type="button" onClick={() => setIsPasteModalOpen(false)} aria-label="닫기">
                  <X size={18} />
                </button>
              </div>
              <p>엑셀에서 아래 순서로 복사한 뒤 붙여넣으세요. 헤더가 포함되어 있어도 처리됩니다.</p>
              <code>대분류  소분류  성명  대상자와 관계  금액  청첩장  메모</code>
              <textarea
                className="paste-textarea"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder={'가족\t직계\t홍길동\t부\t100000\tY\t메모'}
                autoFocus
              />
              {pasteMessage && <p className="category-message paste-message">{pasteMessage}</p>}
              <div className="paste-actions">
                <button className="modal-save" type="button" onClick={applyPastedRows}>신규 로우 추가</button>
              </div>
            </section>
          </div>
        )}
      </main>
  );
}

function ChecklistPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState({ name: '', color: '#e8f4ef' });
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [categoryNotice, setCategoryNotice] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useExcelDownloadLink();

  const categoryColors = ['#e8f4ef', '#eef6ff', '#fff4df', '#f3ecff', '#fceeee'];
  const visibleIds = items.map((item) => item.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const newCount = items.filter((item) => item.isNew).length;
  const editCount = dirtyIds.length;
  const pendingText = [
    newCount > 0 ? `신규 ${newCount}건` : '',
    editCount > 0 ? `수정 ${editCount}건` : ''
  ].filter(Boolean).join(', ') || '저장 전 변경 없음';
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percent = totalCount === 0 ? 0 : Math.round(completedCount / totalCount * 100);

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options
    });
    const text = await response.text();
    if (!response.ok) {
      let errorMessage = '요청 처리에 실패했습니다.';
      if (text) {
        try {
          errorMessage = JSON.parse(text).message ?? errorMessage;
        } catch {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }
    if (response.status === 204) return null;
    return text ? JSON.parse(text) : null;
  }

  async function loadChecklist() {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api('/api/checklist');
      setCategories(data.categories ?? []);
      setItems(data.items ?? []);
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function itemsForCategory(categoryId) {
    return items
      .filter((item) => item.categoryId === categoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  function createDraftItem(categoryId) {
    const sortOrder = itemsForCategory(categoryId).length;
    return {
      id: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      categoryId,
      itemCategory: '',
      todo: '',
      owner: '',
      memo: '',
      completed: false,
      completedDate: '',
      sortOrder,
      isNew: true
    };
  }

  function serializeChecklistItem(item) {
    return {
      ...item,
      completedDate: item.completedDate || null
    };
  }

  function addItem(categoryId = categories[0]?.id) {
    if (!categoryId) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }
    setNotice('');
    setItems((current) => [...current, createDraftItem(categoryId)]);
  }

  function openPasteModal() {
    if (categories.length === 0) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }
    setPasteText('');
    setPasteMessage('');
    setIsPasteModalOpen(true);
  }

  function applyPastedItems() {
    const { lines, hasHeader, headerMap } = parsePastedTable(pasteText, ['분류', '카테고리', '할일', '담당', '메모', '완료여부', '완료일']);
    if (lines.length === 0) {
      setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.');
      return;
    }
    const nextItems = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const categoryName = String(pastedValue(values, headerMap, ['분류'], 0)).trim();
      const category = categories.find((item) => item.name === categoryName);
      if (!category) {
        errors.push(`${rowNumber}행: ${categoryName || '-'} 분류가 없습니다.`);
        return;
      }
      const todo = String(pastedValue(values, headerMap, ['할일', '할 일'], 2)).trim();
      if (!todo) {
        errors.push(`${rowNumber}행: 할일이 비어 있습니다.`);
        return;
      }
      nextItems.push({
        ...createDraftItem(category.id),
        id: makeNewId('new-checklist'),
        itemCategory: String(pastedValue(values, headerMap, ['카테고리'], 1)).trim(),
        todo,
        owner: String(pastedValue(values, headerMap, ['담당'], 3)).trim(),
        memo: String(pastedValue(values, headerMap, ['메모'], 4)).trim(),
        completed: parseBoolean(pastedValue(values, headerMap, ['완료여부', '완료'], 5)),
        completedDate: String(pastedValue(values, headerMap, ['완료일'], 6)).trim()
      });
    });
    if (errors.length > 0) {
      setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''));
      return;
    }
    if (nextItems.length === 0) {
      setPasteMessage('추가할 체크리스트가 없습니다.');
      return;
    }
    setItems((current) => [...nextItems, ...current]);
    setNotice(`엑셀 붙여넣기로 신규 ${nextItems.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsPasteModalOpen(false);
    setPasteText('');
    setPasteMessage('');
  }

  async function downloadChecklistExcel() {
    const exportRows = categories.flatMap((category) => itemsForCategory(category.id).map((item) => ({
      categoryName: category.name,
      itemCategory: item.itemCategory ?? '',
      todo: item.todo ?? '',
      owner: item.owner ?? '',
      memo: item.memo ?? '',
      completed: item.completed ? '완료' : '미완료',
      completedDate: item.completedDate ?? ''
    })));
    if (exportRows.length === 0) {
      setNotice('다운로드할 체크리스트 데이터가 없습니다.');
      return;
    }
    setMessage('');
    setNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_체크리스트',
        sheets: [{
          name: '체크리스트',
          columns: [
            { header: '분류', key: 'categoryName', width: 18 },
            { header: '카테고리', key: 'itemCategory', width: 18 },
            { header: '할일', key: 'todo', width: 36 },
            { header: '담당', key: 'owner', width: 14 },
            { header: '메모', key: 'memo', width: 32 },
            { header: '완료여부', key: 'completed', width: 12 },
            { header: '완료일', key: 'completedDate', width: 14 }
          ],
          rows: exportRows
        }]
      });
      setExcelDownload(download);
      setNotice(`${exportRows.length}건의 체크리스트 엑셀 파일을 생성했습니다.`);
    } catch (error) {
      setNotice('');
      setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
    }
  }

  function updateItem(itemId, field, value) {
    setItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, [field]: value };
      if (field === 'completed') {
        next.completedDate = value ? (item.completedDate || new Date().toISOString().slice(0, 10)) : '';
      }
      return next;
    }));
    if (typeof itemId === 'number') {
      setDirtyIds((current) => current.includes(itemId) ? current : [...current, itemId]);
    }
  }

  function isEditing(itemId, field) {
    return editingCell?.itemId === itemId && editingCell?.field === field;
  }

  function startEditing(itemId, field) {
    setEditingCell({ itemId, field });
  }

  function finishEditing() {
    setEditingCell(null);
  }

  function toggleItemSelection(itemId, checked) {
    setSelectedIds((current) => checked ? [...current, itemId] : current.filter((id) => id !== itemId));
  }

  function toggleAllItems(checked) {
    setSelectedIds(checked ? visibleIds : []);
  }

  function reorderItems(nextItems) {
    const normalized = categories.flatMap((category) => (
      nextItems
        .filter((item) => item.categoryId === category.id)
        .map((item, index) => ({ ...item, sortOrder: index }))
    ));
    setItems(normalized);
    setDirtyIds((current) => {
      const dirty = new Set(current);
      normalized.forEach((item) => {
        if (typeof item.id === 'number') dirty.add(item.id);
      });
      return Array.from(dirty);
    });
  }

  function dropItemOnCategory(categoryId) {
    if (!draggedId) {
      setDragOverCategoryId(null);
      return;
    }
    reorderItems(items.map((item) => item.id === draggedId ? { ...item, categoryId } : item));
    setDraggedId(null);
    setDragOverItemId(null);
    setDragOverCategoryId(null);
  }

  function dropItemOnItem(targetItem) {
    if (!draggedId || draggedId === targetItem.id) {
      setDraggedId(null);
      setDragOverItemId(null);
      setDragOverCategoryId(null);
      return;
    }
    const dragged = items.find((item) => item.id === draggedId);
    if (!dragged) {
      setDraggedId(null);
      setDragOverItemId(null);
      setDragOverCategoryId(null);
      return;
    }
    const withoutDragged = items.filter((item) => item.id !== draggedId);
    const nextDragged = { ...dragged, categoryId: targetItem.categoryId };
    const targetIndex = withoutDragged.findIndex((item) => item.id === targetItem.id);
    const nextItems = [...withoutDragged];
    nextItems.splice(targetIndex < 0 ? nextItems.length : targetIndex, 0, nextDragged);
    reorderItems(nextItems);
    setDraggedId(null);
    setDragOverItemId(null);
    setDragOverCategoryId(null);
  }

  async function saveItems() {
    const newItems = items.filter((item) => item.isNew);
    const dirtyItems = items.filter((item) => !item.isNew && dirtyIds.includes(item.id));
    if (newItems.length === 0 && dirtyItems.length === 0) {
      setNotice('저장할 변경사항이 없습니다.');
      return;
    }
    setMessage('');
    setNotice('');
    try {
      const createdItems = await Promise.all(newItems.map((item) => api('/api/checklist/items', {
        method: 'POST',
        body: JSON.stringify(serializeChecklistItem(item))
      })));
      const updatedItems = await Promise.all(dirtyItems.map((item) => api(`/api/checklist/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(serializeChecklistItem(item))
      })));
      setItems((current) => {
        const createdQueue = [...createdItems];
        return current.map((item) => {
          const updated = updatedItems.find((saved) => saved.id === item.id);
          if (updated) return updated;
          if (!item.isNew) return item;
          return createdQueue.shift();
        });
      });
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
      setNotice(`${createdItems.length + updatedItems.length}개 항목을 저장했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSelectedItems() {
    if (selectedIds.length === 0) {
      setNotice('삭제할 체크리스트를 선택하세요.');
      return;
    }
    const persistedIds = selectedIds.filter((id) => typeof id === 'number');
    setMessage('');
    setNotice('');
    try {
      if (persistedIds.length > 0) {
        await api('/api/checklist/items', {
          method: 'DELETE',
          body: JSON.stringify(persistedIds)
        });
      }
      setItems((current) => current.filter((item) => !selectedIds.includes(item.id)));
      setDirtyIds((current) => current.filter((id) => !selectedIds.includes(id)));
      setNotice(`${selectedIds.length}개 항목을 삭제했습니다.`);
      setSelectedIds([]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveChecklistCategory(event) {
    event.preventDefault();
    const name = draftCategory.name.trim();
    if (!name) {
      setCategoryMessage('분류명을 입력하세요.');
      setCategoryNotice('');
      return;
    }
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      const created = await api('/api/checklist/categories', {
        method: 'POST',
        body: JSON.stringify({ ...draftCategory, name, sortOrder: categories.length })
      });
      setCategories((current) => [...current, created]);
      setDraftCategory({ name: '', color: '#e8f4ef' });
      setCategoryNotice('분류를 추가했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
    }
  }

  function updateChecklistCategoryLocal(categoryId, field, value) {
    setCategories((current) => current.map((category) => (
      category.id === categoryId ? { ...category, [field]: value } : category
    )));
  }

  async function updateChecklistCategory(category) {
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      const saved = await api(`/api/checklist/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify(category)
      });
      setCategories((current) => current.map((item) => item.id === saved.id ? saved : item));
      setCategoryNotice('분류를 저장했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadChecklist();
    }
  }

  async function deleteChecklistCategory(category) {
    if (items.some((item) => item.categoryId === category.id)) {
      setCategoryMessage('체크리스트가 있는 분류는 삭제할 수 없습니다.');
      setCategoryNotice('');
      return;
    }
    if (!window.confirm(`${category.name} 분류를 삭제할까요?`)) return;
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      await api(`/api/checklist/categories/${category.id}`, { method: 'DELETE' });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setCategoryNotice('분류를 삭제했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadChecklist();
    }
  }

  useEffect(() => {
    loadChecklist();
  }, []);

  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Power 프로젝트</p>
          <h1>체크리스트</h1>
          <p className="summary">결혼 준비 항목을 분류별로 정리하고 진행률을 관리합니다.</p>
        </div>
        <button className="icon-button" type="button" onClick={loadChecklist} disabled={isLoading} aria-label="새로고침">
          <RefreshCw size={18} />
        </button>
      </section>

      <section className="progress-panel">
        <div>
          <strong>{completedCount}/{totalCount} 완료 {percent}%</strong>
          <span>체크리스트 진행률</span>
        </div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        <div className="progress-metrics">
          <span>총 {totalCount}개</span>
          <span>완료 {completedCount}개</span>
          <span>미완료 {totalCount - completedCount}개</span>
        </div>
      </section>

      {message && <p className="message">{message}</p>}
      <DownloadNotice message={notice} download={excelDownload} />

      <section className="table-panel checklist-panel">
        <div className="table-toolbar">
          <span className={`pending-inline ${newCount > 0 || editCount > 0 ? 'active' : ''}`}>{pendingText}</span>
          <div className="table-toolbar-actions">
            <button className="small-action category-manage-button" type="button" onClick={() => setIsModalOpen(true)}>
              <Settings size={14} /> 분류 관리
            </button>
            <button className="small-action" type="button" onClick={() => addItem()}>
              <Plus size={14} /> 행 추가
            </button>
            <button className="small-action" type="button" onClick={openPasteModal}>엑셀 붙여넣기</button>
            <button className="small-action" type="button" onClick={downloadChecklistExcel}>엑셀 다운로드</button>
            <button className="small-delete" type="button" onClick={deleteSelectedItems}>삭제</button>
            <button className={`small-save ${newCount > 0 || editCount > 0 ? 'has-pending' : ''}`} type="button" onClick={saveItems}>저장</button>
          </div>
        </div>

        <div className="grid-table-wrap checklist-table-wrap">
          <table className="checklist-table">
            <thead>
              <tr>
                <th>로우선택</th>
                <th className="check-column">
                  <PrettyCheckbox checked={isAllSelected} onChange={toggleAllItems} tone="danger" />
                </th>
                <th>카테고리</th>
                <th>할일</th>
                <th>담당</th>
                <th>메모</th>
                <th>완료여부</th>
                <th>완료일</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan="8">
                    <strong>등록된 분류가 없습니다.</strong>
                    <span>분류 관리에서 결혼 준비 시점별 분류를 먼저 추가하세요.</span>
                  </td>
                </tr>
              )}
              {categories.map((category) => {
                const categoryItems = itemsForCategory(category.id);
                return (
                  <React.Fragment key={category.id}>
                    <tr
                      className={`checklist-category-row ${draggedId && dragOverCategoryId === category.id ? 'drag-over-row' : ''}`}
                      onClick={() => addItem(category.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverCategoryId(category.id);
                        setDragOverItemId(null);
                      }}
                      onDragLeave={() => setDragOverCategoryId((current) => current === category.id ? null : current)}
                      onDrop={() => dropItemOnCategory(category.id)}
                    >
                      <td colSpan="8" style={{ '--category-color': category.color }}>
                        <strong>{category.name}</strong>
                        <span>{categoryItems.length === 0 ? '분류 로우 클릭 시 체크리스트 추가' : `${categoryItems.length}개 항목`}</span>
                      </td>
                    </tr>
                    {categoryItems.map((item) => (
                      <tr
                        className={`checklist-item-row ${draggedId && dragOverItemId === item.id && draggedId !== item.id ? 'drag-over-row' : ''}`}
                        key={item.id}
                        draggable
                        onDragStart={() => {
                          setDraggedId(item.id);
                          setDragOverItemId(null);
                          setDragOverCategoryId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverItemId(null);
                          setDragOverCategoryId(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverItemId(item.id);
                          setDragOverCategoryId(null);
                        }}
                        onDragLeave={() => setDragOverItemId((current) => current === item.id ? null : current)}
                        onDrop={() => dropItemOnItem(item)}
                      >
                        <td className="drag-column" aria-label="로우선택"><GripVertical size={16} /></td>
                        <td className="check-column">
                          <PrettyCheckbox
                            checked={selectedIds.includes(item.id)}
                            onChange={(checked) => toggleItemSelection(item.id, checked)}
                            tone="danger"
                          />
                        </td>
                        <td>
                          {item.isNew || isEditing(item.id, 'itemCategory') ? (
                            <input
                              autoFocus={!item.isNew}
                              value={item.itemCategory ?? ''}
                              onBlur={finishEditing}
                              onChange={(event) => updateItem(item.id, 'itemCategory', event.target.value)}
                              placeholder="카테고리"
                            />
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(item.id, 'itemCategory')}>{item.itemCategory || '-'}</span>
                          )}
                        </td>
                        <td>
                          {item.isNew || isEditing(item.id, 'todo') ? (
                            <input
                              autoFocus={!item.isNew}
                              value={item.todo ?? ''}
                              onBlur={finishEditing}
                              onChange={(event) => updateItem(item.id, 'todo', event.target.value)}
                              placeholder="할일"
                            />
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(item.id, 'todo')}>{item.todo || '-'}</span>
                          )}
                        </td>
                        <td>
                          {item.isNew || isEditing(item.id, 'owner') ? (
                            <input
                              autoFocus={!item.isNew}
                              value={item.owner ?? ''}
                              onBlur={finishEditing}
                              onChange={(event) => updateItem(item.id, 'owner', event.target.value)}
                              placeholder="담당"
                            />
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(item.id, 'owner')}>{item.owner || '-'}</span>
                          )}
                        </td>
                        <td>
                          {item.isNew || isEditing(item.id, 'memo') ? (
                            <input
                              autoFocus={!item.isNew}
                              value={item.memo ?? ''}
                              onBlur={finishEditing}
                              onChange={(event) => updateItem(item.id, 'memo', event.target.value)}
                              placeholder="메모"
                            />
                          ) : (
                            <span className="read-text memo-text" onDoubleClick={() => startEditing(item.id, 'memo')}>{item.memo || '-'}</span>
                          )}
                        </td>
                        <td className="check-column">
                          {item.isNew || isEditing(item.id, 'completed') ? (
                            <PrettyCheckbox
                              checked={item.completed}
                              onChange={(checked) => {
                                updateItem(item.id, 'completed', checked);
                                if (!item.isNew) setEditingCell(null);
                              }}
                            />
                          ) : (
                            <span className="read-text center-text" onDoubleClick={() => startEditing(item.id, 'completed')}>{item.completed ? '완료' : '미완료'}</span>
                          )}
                        </td>
                        <td>
                          {item.isNew || isEditing(item.id, 'completedDate') ? (
                            <input
                              autoFocus={!item.isNew}
                              type="date"
                              value={item.completedDate ?? ''}
                              onBlur={finishEditing}
                              onChange={(event) => updateItem(item.id, 'completedDate', event.target.value)}
                            />
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(item.id, 'completedDate')}>{item.completedDate || '-'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop">
          <section className="category-modal checklist-category-modal">
            <div className="modal-title-row">
              <h2>분류 관리</h2>
              <button className="icon-button" type="button" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <form className="checklist-category-form" onSubmit={saveChecklistCategory}>
              <label>
                <span>분류명</span>
                <input value={draftCategory.name} onChange={(event) => setDraftCategory((current) => ({ ...current, name: event.target.value }))} placeholder="예: 결혼 6개월 전" />
              </label>
              <label>
                <span>색상</span>
                <div className="color-picker-row">
                  {categoryColors.map((color) => (
                    <button
                      className={draftCategory.color === color ? 'active' : ''}
                      key={color}
                      type="button"
                      style={{ background: color }}
                      onClick={() => setDraftCategory((current) => ({ ...current, color }))}
                      aria-label={color}
                    />
                  ))}
                </div>
              </label>
              <button className="modal-save" type="submit">추가</button>
            </form>

            {categoryMessage && <p className="category-message">{categoryMessage}</p>}
            {categoryNotice && <p className="category-notice">{categoryNotice}</p>}

            <div className="category-list">
              {categories.length === 0 ? (
                <p>등록된 분류가 없습니다.</p>
              ) : categories.map((category) => (
                <div className="checklist-category-edit-row" key={category.id}>
                  <input value={category.name} onChange={(event) => updateChecklistCategoryLocal(category.id, 'name', event.target.value)} />
                  <div className="color-picker-row">
                    {categoryColors.map((color) => (
                      <button
                        className={category.color === color ? 'active' : ''}
                        key={color}
                        type="button"
                        style={{ background: color }}
                        onClick={() => updateChecklistCategoryLocal(category.id, 'color', color)}
                        aria-label={color}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={() => updateChecklistCategory(category)}>저장</button>
                  <button className="category-delete-button" type="button" onClick={() => deleteChecklistCategory(category)}>삭제</button>
                </div>
              ))}
            </div>
            <p>체크리스트가 있는 분류는 삭제할 수 없습니다.</p>
          </section>
        </div>
      )}
      {isPasteModalOpen && (
        <PasteModal
          title="체크리스트 엑셀 붙여넣기"
          guide="분류  카테고리  할일  담당  메모  완료여부  완료일"
          example={'결혼 6개월 전\t예약\t웨딩홀 상담 예약\tzeroy\t메모\t미완료\t'}
          value={pasteText}
          message={pasteMessage}
          onChange={setPasteText}
          onClose={() => setIsPasteModalOpen(false)}
          onApply={applyPastedItems}
        />
      )}
    </main>
  );
}

function BudgetPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [dirtyAssetIds, setDirtyAssetIds] = useState([]);
  const [dirtyCategoryIds, setDirtyCategoryIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState({ name: '' });
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [categoryNotice, setCategoryNotice] = useState('');
  const [assetMessage, setAssetMessage] = useState('');
  const [assetNotice, setAssetNotice] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [isAssetPasteModalOpen, setIsAssetPasteModalOpen] = useState(false);
  const [assetPasteText, setAssetPasteText] = useState('');
  const [assetPasteMessage, setAssetPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useExcelDownloadLink();
  const [assetExcelDownload, setAssetExcelDownload] = useExcelDownloadLink();
  const [isSimpleView, setIsSimpleView] = useState(() => {
    const saved = window.localStorage.getItem(BUDGET_SIMPLE_VIEW_KEY);
    return saved === null ? true : saved === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  const visibleIds = items.map((item) => item.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const newCount = items.filter((item) => item.isNew).length;
  const editCount = dirtyIds.length;
  const hasPendingChanges = newCount > 0 || editCount > 0;
  const pendingText = [
    newCount > 0 ? `신규 ${newCount}건` : '',
    editCount > 0 ? `수정 ${editCount}건` : ''
  ].filter(Boolean).join(', ') || '저장 전 변경 없음';

  const totals = useMemo(() => items.reduce((acc, item) => {
    acc.spent += Number(item.spentAmount || 0);
    return acc;
  }, { spent: 0 }), [items]);

  const assetTotals = useMemo(() => assets.reduce((acc, asset) => {
    const amount = Number(asset.amount || 0);
    if (asset.availability === '가용') {
      acc.available += amount;
    }
    acc.total += amount;
    return acc;
  }, { available: 0, total: 0 }), [assets]);

  const assetNewCount = assets.filter((asset) => asset.isNew).length;
  const assetEditCount = dirtyAssetIds.length;
  const hasAssetPendingChanges = assetNewCount > 0 || assetEditCount > 0;
  const hasCategoryPendingChanges = dirtyCategoryIds.length > 0 || draftCategory.name.trim().length > 0;
  const assetVisibleIds = assets.map((asset) => asset.id);
  const isAllAssetsSelected = assetVisibleIds.length > 0 && assetVisibleIds.every((id) => selectedAssetIds.includes(id));

  const summaries = useMemo(() => categories.map((category) => {
    const categoryItems = items.filter((item) => item.categoryId === category.id);
    const summary = categoryItems.reduce((acc, item) => {
      acc.spent += Number(item.spentAmount || 0);
      return acc;
    }, { spent: 0 });
    const allocated = Number(category.allocatedAmount || 0);
    return { category, count: categoryItems.length, allocated, spent: summary.spent, remaining: allocated - summary.spent };
  }), [categories, items]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options
    });
    const text = await response.text();
    if (!response.ok) {
      let errorMessage = '요청 처리에 실패했습니다.';
      if (text) {
        try {
          errorMessage = JSON.parse(text).message ?? errorMessage;
        } catch {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }
    if (response.status === 204) return null;
    return text ? JSON.parse(text) : null;
  }

  async function loadBudget() {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api('/api/budget');
      setCategories(data.categories ?? []);
      setItems(data.items ?? []);
      setAssets(data.assets ?? []);
      setDirtyIds([]);
      setDirtyAssetIds([]);
      setDirtyCategoryIds([]);
      setSelectedIds([]);
      setSelectedAssetIds([]);
      setEditingCell(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function addItem() {
    if (categories.length === 0) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }
    setNotice('');
    setItems((current) => [
      {
        id: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        categoryId: categories[0].id,
        detail: '',
        spentAmount: 0,
        note: '',
        isNew: true
      },
      ...current
    ]);
  }

  function openPasteModal() {
    if (categories.length === 0) {
      setCategoryMessage('');
      setCategoryNotice('');
      setIsModalOpen(true);
      return;
    }
    setPasteText('');
    setPasteMessage('');
    setIsPasteModalOpen(true);
  }

  function applyPastedBudgetItems() {
    const { lines, hasHeader, headerMap } = parsePastedTable(pasteText, ['대분류', '세부항목', '지출', '비고']);
    if (lines.length === 0) {
      setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.');
      return;
    }
    const nextItems = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const categoryNameValue = String(pastedValue(values, headerMap, ['대분류', '분류'], 0)).trim();
      const category = categories.find((item) => item.name === categoryNameValue);
      if (!category) {
        errors.push(`${rowNumber}행: ${categoryNameValue || '-'} 대분류가 없습니다.`);
        return;
      }
      const detail = String(pastedValue(values, headerMap, ['세부항목', '항목'], 1)).trim();
      if (!detail) {
        errors.push(`${rowNumber}행: 세부항목이 비어 있습니다.`);
        return;
      }
      nextItems.push({
        id: makeNewId('new-budget'),
        categoryId: category.id,
        detail,
        spentAmount: parseAmount(pastedValue(values, headerMap, ['지출', '지출원', '지출(원)'], 2)),
        note: String(pastedValue(values, headerMap, ['비고', '메모'], 3)).trim(),
        isNew: true
      });
    });
    if (errors.length > 0) {
      setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''));
      return;
    }
    if (nextItems.length === 0) {
      setPasteMessage('추가할 예산 항목이 없습니다.');
      return;
    }
    setItems((current) => [...nextItems, ...current]);
    setNotice(`엑셀 붙여넣기로 신규 ${nextItems.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsPasteModalOpen(false);
    setPasteText('');
    setPasteMessage('');
  }

  async function downloadBudgetExcel() {
    const detailRows = items.map((item) => ({
      categoryName: categoryName(item.categoryId),
      detail: item.detail ?? '',
      spentAmount: Number(item.spentAmount || 0),
      note: item.note ?? ''
    }));
    if (detailRows.length === 0 && summaries.length === 0 && assets.length === 0) {
      setNotice('다운로드할 예산관리 데이터가 없습니다.');
      return;
    }
    setMessage('');
    setNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_예산관리',
        sheets: [
          {
            name: '대분류별 요약',
            columns: [
              { header: '대분류', key: 'categoryName', width: 18 },
              { header: '배정금액', key: 'allocated', width: 16, numFmt: '#,##0"원"' },
              { header: '지출합계', key: 'spent', width: 16, numFmt: '#,##0"원"' },
              { header: '잔여금액', key: 'remaining', width: 16, numFmt: '#,##0"원"' }
            ],
            rows: summaries.map((summary) => ({
              categoryName: summary.category.name,
              allocated: summary.allocated,
              spent: summary.spent,
              remaining: summary.remaining
            }))
          },
          {
            name: '예산 상세 내역',
            columns: [
              { header: '대분류', key: 'categoryName', width: 18 },
              { header: '세부항목', key: 'detail', width: 24 },
              { header: '지출(원)', key: 'spentAmount', width: 16, numFmt: '#,##0"원"' },
              { header: '비고', key: 'note', width: 32 }
            ],
            rows: detailRows
          },
          {
            name: '나의 예산',
            columns: [
              { header: '소유자', key: 'owner', width: 14 },
              { header: '구분', key: 'availability', width: 12 },
              { header: '자산명', key: 'assetName', width: 20 },
              { header: '금액', key: 'amount', width: 16, numFmt: '#,##0"원"' },
              { header: '비고', key: 'note', width: 28 }
            ],
            rows: assets.map((asset) => ({
              owner: asset.owner ?? '',
              availability: asset.availability ?? '',
              assetName: asset.assetName ?? '',
              amount: Number(asset.amount || 0),
              note: asset.note ?? ''
            }))
          }
        ]
      });
      setExcelDownload(download);
      setNotice('예산관리 엑셀 파일을 생성했습니다.');
    } catch (error) {
      setNotice('');
      setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
    }
  }

  function updateItem(itemId, field, value) {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, [field]: value } : item));
    if (typeof itemId === 'number') {
      setDirtyIds((current) => current.includes(itemId) ? current : [...current, itemId]);
    }
  }

  function addAsset() {
    setAssetNotice('');
    setAssets((current) => [
      {
        id: `new-asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        owner: '',
        availability: '가용',
        assetName: '',
        amount: 0,
        note: '',
        isNew: true
      },
      ...current
    ]);
  }

  function openAssetPasteModal() {
    setAssetPasteText('');
    setAssetPasteMessage('');
    setIsAssetPasteModalOpen(true);
  }

  function applyPastedAssets() {
    const { lines, hasHeader, headerMap } = parsePastedTable(assetPasteText, ['소유자', '구분', '자산명', '금액', '비고']);
    if (lines.length === 0) {
      setAssetPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.');
      return;
    }
    const nextAssets = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const owner = String(pastedValue(values, headerMap, ['소유자'], 0)).trim();
      const assetName = String(pastedValue(values, headerMap, ['자산명', '항목'], 2)).trim();
      if (!owner || !assetName) {
        errors.push(`${rowNumber}행: 소유자와 자산명을 입력하세요.`);
        return;
      }
      const availability = String(pastedValue(values, headerMap, ['구분'], 1)).trim() || '가용';
      nextAssets.push({
        id: makeNewId('new-asset'),
        owner,
        availability: availability === '비가용' ? '비가용' : '가용',
        assetName,
        amount: parseAmount(pastedValue(values, headerMap, ['금액'], 3)),
        note: String(pastedValue(values, headerMap, ['비고', '메모'], 4)).trim(),
        isNew: true
      });
    });
    if (errors.length > 0) {
      setAssetPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''));
      return;
    }
    if (nextAssets.length === 0) {
      setAssetPasteMessage('추가할 나의 예산 항목이 없습니다.');
      return;
    }
    setAssets((current) => [...nextAssets, ...current]);
    setAssetNotice(`엑셀 붙여넣기로 신규 ${nextAssets.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsAssetPasteModalOpen(false);
    setAssetPasteText('');
    setAssetPasteMessage('');
  }

  async function downloadAssetsExcel() {
    if (assets.length === 0) {
      setAssetNotice('다운로드할 나의 예산 데이터가 없습니다.');
      return;
    }
    setAssetMessage('');
    setAssetNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_나의예산',
        sheets: [{
          name: '나의 예산',
          columns: [
            { header: '소유자', key: 'owner', width: 14 },
            { header: '구분', key: 'availability', width: 12 },
            { header: '자산명', key: 'assetName', width: 20 },
            { header: '금액', key: 'amount', width: 16, numFmt: '#,##0"원"' },
            { header: '비고', key: 'note', width: 28 }
          ],
          rows: assets.map((asset) => ({
            owner: asset.owner ?? '',
            availability: asset.availability ?? '',
            assetName: asset.assetName ?? '',
            amount: Number(asset.amount || 0),
            note: asset.note ?? ''
          }))
        }]
      });
      setAssetExcelDownload(download);
      setAssetNotice(`${assets.length}건의 나의 예산 엑셀 파일을 생성했습니다.`);
    } catch (error) {
      setAssetNotice('');
      setAssetMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
    }
  }

  function updateAsset(assetId, field, value) {
    setAssets((current) => current.map((asset) => asset.id === assetId ? { ...asset, [field]: value } : asset));
    if (typeof assetId === 'number') {
      setDirtyAssetIds((current) => current.includes(assetId) ? current : [...current, assetId]);
    }
  }

  function toggleAssetSelection(assetId, checked) {
    setSelectedAssetIds((current) => checked ? [...current, assetId] : current.filter((id) => id !== assetId));
  }

  function toggleAllAssets(checked) {
    setSelectedAssetIds(checked ? assetVisibleIds : []);
  }

  function toggleItemSelection(itemId, checked) {
    setSelectedIds((current) => checked ? [...current, itemId] : current.filter((id) => id !== itemId));
  }

  function toggleAllItems(checked) {
    setSelectedIds(checked ? visibleIds : []);
  }

  function isEditing(itemId, field) {
    return editingCell?.itemId === itemId && editingCell?.field === field;
  }

  function startEditing(itemId, field) {
    setEditingCell({ itemId, field });
  }

  function finishEditing() {
    setEditingCell(null);
  }

  function serializeItem(item) {
    return {
      categoryId: Number(item.categoryId),
      detail: item.detail ?? '',
      budgetAmount: 0,
      spentAmount: Number(item.spentAmount || 0),
      note: item.note ?? ''
    };
  }

  function serializeAsset(asset) {
    return {
      owner: asset.owner ?? '',
      availability: asset.availability ?? '가용',
      assetName: asset.assetName ?? '',
      amount: Number(asset.amount || 0),
      note: asset.note ?? ''
    };
  }

  async function saveItems() {
    const newItems = items.filter((item) => item.isNew);
    const dirtyItems = items.filter((item) => !item.isNew && dirtyIds.includes(item.id));
    if (newItems.length === 0 && dirtyItems.length === 0) {
      setNotice('저장할 변경사항이 없습니다.');
      return;
    }
    setMessage('');
    setNotice('');
    try {
      const createdItems = await Promise.all(newItems.map((item) => api('/api/budget/items', {
        method: 'POST',
        body: JSON.stringify(serializeItem(item))
      })));
      const updatedItems = await Promise.all(dirtyItems.map((item) => api(`/api/budget/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(serializeItem(item))
      })));
      setItems((current) => {
        const createdQueue = [...createdItems];
        return current.map((item) => {
          const updated = updatedItems.find((saved) => saved.id === item.id);
          if (updated) return updated;
          if (!item.isNew) return item;
          return createdQueue.shift();
        });
      });
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
      setNotice(`${createdItems.length + updatedItems.length}개 항목을 저장했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSelectedItems() {
    if (selectedIds.length === 0) {
      setNotice('삭제할 예산 항목을 선택하세요.');
      return;
    }
    const persistedIds = selectedIds.filter((id) => typeof id === 'number');
    setMessage('');
    setNotice('');
    try {
      if (persistedIds.length > 0) {
        await api('/api/budget/items', {
          method: 'DELETE',
          body: JSON.stringify(persistedIds)
        });
      }
      setItems((current) => current.filter((item) => !selectedIds.includes(item.id)));
      setDirtyIds((current) => current.filter((id) => !selectedIds.includes(id)));
      setSelectedIds([]);
      setNotice(`${selectedIds.length}개 항목을 삭제했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveAssets() {
    const newAssets = assets.filter((asset) => asset.isNew);
    const dirtyAssets = assets.filter((asset) => !asset.isNew && dirtyAssetIds.includes(asset.id));
    if (newAssets.length === 0 && dirtyAssets.length === 0) {
      setAssetNotice('저장할 나의 예산 변경사항이 없습니다.');
      return;
    }
    setAssetMessage('');
    setAssetNotice('');
    try {
      const createdAssets = await Promise.all(newAssets.map((asset) => api('/api/budget/assets', {
        method: 'POST',
        body: JSON.stringify(serializeAsset(asset))
      })));
      const updatedAssets = await Promise.all(dirtyAssets.map((asset) => api(`/api/budget/assets/${asset.id}`, {
        method: 'PUT',
        body: JSON.stringify(serializeAsset(asset))
      })));
      setAssets((current) => {
        const createdQueue = [...createdAssets];
        return current.map((asset) => {
          const updated = updatedAssets.find((saved) => saved.id === asset.id);
          if (updated) return updated;
          if (!asset.isNew) return asset;
          return createdQueue.shift();
        });
      });
      setDirtyAssetIds([]);
      setSelectedAssetIds([]);
      setAssetNotice(`${createdAssets.length + updatedAssets.length}개 나의 예산 항목을 저장했습니다.`);
    } catch (error) {
      setAssetMessage(error.message);
    }
  }

  async function deleteSelectedAssets() {
    if (selectedAssetIds.length === 0) {
      setAssetNotice('삭제할 나의 예산 항목을 선택하세요.');
      return;
    }
    const persistedIds = selectedAssetIds.filter((id) => typeof id === 'number');
    setAssetMessage('');
    setAssetNotice('');
    try {
      if (persistedIds.length > 0) {
        await api('/api/budget/assets', {
          method: 'DELETE',
          body: JSON.stringify(persistedIds)
        });
      }
      setAssets((current) => current.filter((asset) => !selectedAssetIds.includes(asset.id)));
      setDirtyAssetIds((current) => current.filter((id) => !selectedAssetIds.includes(id)));
      setSelectedAssetIds([]);
      setAssetNotice(`${selectedAssetIds.length}개 나의 예산 항목을 삭제했습니다.`);
    } catch (error) {
      setAssetMessage(error.message);
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    const name = draftCategory.name.trim();
    if (!name) {
      setCategoryMessage('대분류명을 입력하세요.');
      setCategoryNotice('');
      return;
    }
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      const created = await api('/api/budget/categories', {
        method: 'POST',
        body: JSON.stringify({ name, sortOrder: categories.length, allocatedAmount: 0 })
      });
      setCategories((current) => [...current, created]);
      setDraftCategory({ name: '' });
      setCategoryNotice('대분류를 추가했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
    }
  }

  function updateCategoryLocal(categoryId, field, value) {
    setCategories((current) => current.map((category) => (
      category.id === categoryId ? { ...category, [field]: value } : category
    )));
    setDirtyCategoryIds((current) => current.includes(categoryId) ? current : [...current, categoryId]);
  }

  async function updateCategory(category) {
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      const saved = await api(`/api/budget/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: category.name,
          sortOrder: category.sortOrder,
          allocatedAmount: Number(category.allocatedAmount || 0)
        })
      });
      setCategories((current) => current.map((item) => item.id === saved.id ? saved : item));
      setDirtyCategoryIds((current) => current.filter((id) => id !== category.id));
      setCategoryNotice('대분류를 저장했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadBudget();
    }
  }

  async function deleteCategory(category) {
    if (items.some((item) => item.categoryId === category.id)) {
      setCategoryMessage('예산 항목이 있는 대분류는 삭제할 수 없습니다.');
      setCategoryNotice('');
      return;
    }
    if (!window.confirm(`${category.name} 대분류를 삭제할까요?`)) return;
    setCategoryMessage('');
    setCategoryNotice('');
    try {
      await api(`/api/budget/categories/${category.id}`, { method: 'DELETE' });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setDirtyCategoryIds((current) => current.filter((id) => id !== category.id));
      setCategoryNotice('대분류를 삭제했습니다.');
    } catch (error) {
      setCategoryMessage(error.message);
      await loadBudget();
    }
  }

  function categoryName(categoryId) {
    return categories.find((category) => category.id === categoryId)?.name ?? '-';
  }

  function closePopup(hasPendingChanges, close) {
    if (hasPendingChanges && !window.confirm('수정중인 것이 있습니다. 닫으시겠습니까?')) {
      return;
    }
    close();
  }

  function closeBudgetCategoryModal() {
    closePopup(hasCategoryPendingChanges, () => setIsModalOpen(false));
  }

  function closeBudgetAssetModal() {
    closePopup(hasAssetPendingChanges, () => setIsAssetModalOpen(false));
  }

  useEffect(() => {
    loadBudget();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BUDGET_SIMPLE_VIEW_KEY, String(isSimpleView));
  }, [isSimpleView]);

  const availableSpare = assetTotals.available - totals.spent;
  const totalSpare = assetTotals.total - totals.spent;

  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Power 프로젝트</p>
          <div className="title-row">
            <h1>예산관리</h1>
            <PrettyCheckbox checked={isSimpleView} onChange={setIsSimpleView} label="간단하게 보기" />
          </div>
          <p className="summary">대분류별 예산과 실제 지출을 함께 관리합니다.</p>
        </div>
        <button className="icon-button" type="button" onClick={loadBudget} disabled={isLoading} aria-label="새로고침">
          <RefreshCw size={18} />
        </button>
      </section>

      <section className="budget-card-grid">
        <button className="budget-stat-card clickable" type="button" onClick={() => setIsAssetModalOpen(true)}>
          <Settings className="card-settings-icon" size={16} />
          <Wallet size={30} />
          <span>나의 예산</span>
          <strong>{currency(assetTotals.available)} / {currency(assetTotals.total)}</strong>
          <em>{assetTotals.total === 0 ? '클릭해서 금액을 추가하세요' : '가용금액 / 전체금액'}</em>
        </button>
        <div className="budget-stat-card spent">
          <ReceiptText size={30} />
          <span>예상 지출</span>
          <strong>{currency(totals.spent)}</strong>
          <em>예산 상세 내역 합산</em>
        </div>
        <div className={`budget-stat-card ${availableSpare < 0 ? 'danger' : 'safe'}`}>
          <CircleCheck size={30} />
          <span>가용 기준 여유</span>
          <strong>{currency(availableSpare)}</strong>
          <em>가용금액 - 예상 지출</em>
        </div>
        <div className={`budget-stat-card ${totalSpare < 0 ? 'danger' : 'total'}`}>
          <PieChart size={30} />
          <span>전체 기준 여유</span>
          <strong>{currency(totalSpare)}</strong>
          <em>전체금액 - 예상 지출</em>
        </div>
      </section>

      {message && <p className="message">{message}</p>}
      <DownloadNotice message={notice} download={excelDownload} />

      <section className="table-panel budget-panel">
        <div className="budget-section">
          <div className="section-title-row">
            <h2>대분류별 요약</h2>
              <button className="small-action category-manage-button" type="button" onClick={() => setIsModalOpen(true)}>
              <Settings size={14} /> 분류 관리
            </button>
          </div>
          <div className="grid-table-wrap budget-summary-wrap">
            <table className={`budget-table budget-summary-table ${isSimpleView ? 'simple-view' : ''}`}>
              <thead>
                <tr>
                  <th>대분류</th>
                  {!isSimpleView && <th>배정금액</th>}
                  <th>지출합계</th>
                  {!isSimpleView && <th>잔여금액</th>}
                  {!isSimpleView && <th>상태</th>}
                </tr>
              </thead>
              <tbody>
                {summaries.length === 0 ? (
                  <tr>
                    <td className="empty-table" colSpan={isSimpleView ? 2 : 5}>
                      <strong>등록된 대분류가 없습니다.</strong>
                      <span>분류 관리에서 예산 대분류를 먼저 추가하세요.</span>
                    </td>
                  </tr>
                ) : summaries.map((summary) => (
                  <tr key={summary.category.id}>
                    <td className="major-cell">{summary.category.name}</td>
                    {!isSimpleView && <td>{currency(summary.allocated)}</td>}
                    <td className="spent-cell">{currency(summary.spent)}</td>
                    {!isSimpleView && <td className="readonly-metric">{currency(summary.remaining)}</td>}
                    {!isSimpleView && (
                      <td>
                        <span className={`status-chip ${summary.remaining < 0 ? 'danger' : 'safe'}`}>
                          {summary.remaining < 0 ? '초과' : '여유'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="budget-section">
          <div className="section-title-row">
            <h2>예산 상세 내역</h2>
            <div className="detail-title-actions">
              <span className={`pending-inline ${hasPendingChanges ? 'active' : ''}`}>{pendingText}</span>
              <div className="table-toolbar-actions">
                <button className="small-action" type="button" onClick={addItem}>
                  <Plus size={14} /> 행 추가
                </button>
                <button className="small-action" type="button" onClick={openPasteModal}>엑셀 붙여넣기</button>
                <button className="small-action" type="button" onClick={downloadBudgetExcel}>엑셀 다운로드</button>
                <button className="small-delete" type="button" onClick={deleteSelectedItems}>삭제</button>
                <button className={`small-save ${hasPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveItems}>저장</button>
              </div>
            </div>
          </div>
          <div className="grid-table-wrap budget-detail-wrap">
            <table className={`budget-table budget-detail-table ${isSimpleView ? 'simple-view' : ''}`}>
              <thead>
                <tr>
                  <th className="check-column">
                    <PrettyCheckbox checked={isAllSelected} onChange={toggleAllItems} tone="danger" />
                  </th>
                  <th>대분류</th>
                  <th>세부항목</th>
                  <th>지출(원)</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan="5">
                      <strong>표시할 예산 항목이 없습니다.</strong>
                      <span>분류 관리에서 대분류를 추가한 뒤 행 추가로 예산을 입력하세요.</span>
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className={item.isNew ? 'new-row' : ''}>
                    <td className="check-column">
                      <PrettyCheckbox
                        checked={selectedIds.includes(item.id)}
                        onChange={(checked) => toggleItemSelection(item.id, checked)}
                        tone="danger"
                      />
                    </td>
                    <td className="major-cell">
                      {item.isNew || isEditing(item.id, 'categoryId') ? (
                        <select
                          autoFocus={!item.isNew}
                          value={item.categoryId}
                          onBlur={finishEditing}
                          onChange={(event) => {
                            updateItem(item.id, 'categoryId', Number(event.target.value));
                            if (!item.isNew) finishEditing();
                          }}
                        >
                          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                      ) : (
                        <span className="read-text" onDoubleClick={() => startEditing(item.id, 'categoryId')}>{categoryName(item.categoryId)}</span>
                      )}
                    </td>
                    <td>
                      {item.isNew || isEditing(item.id, 'detail') ? (
                        <input
                          autoFocus={!item.isNew}
                          value={item.detail ?? ''}
                          onBlur={finishEditing}
                          onChange={(event) => updateItem(item.id, 'detail', event.target.value)}
                          placeholder="세부항목"
                        />
                      ) : (
                        <span className="read-text" onDoubleClick={() => startEditing(item.id, 'detail')}>{item.detail || '-'}</span>
                      )}
                    </td>
                    <td>
                      {item.isNew || isEditing(item.id, 'spentAmount') ? (
                        <input
                          autoFocus={!item.isNew}
                          type="number"
                          value={item.spentAmount}
                          onBlur={finishEditing}
                          onChange={(event) => updateItem(item.id, 'spentAmount', event.target.value)}
                        />
                      ) : (
                        <span className="read-text spent-cell" onDoubleClick={() => startEditing(item.id, 'spentAmount')}>{currency(item.spentAmount)}</span>
                      )}
                    </td>
                    <td>
                      {item.isNew || isEditing(item.id, 'note') ? (
                        <input
                          autoFocus={!item.isNew}
                          value={item.note ?? ''}
                          onBlur={finishEditing}
                          onChange={(event) => updateItem(item.id, 'note', event.target.value)}
                          placeholder="비고"
                        />
                      ) : (
                        <span className="read-text memo-text" onDoubleClick={() => startEditing(item.id, 'note')}>{item.note || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBudgetCategoryModal();
            }
          }}
        >
          <section className="category-modal budget-category-modal">
            <div className="modal-title-row">
              <h2>분류 관리</h2>
              <button className="icon-button" type="button" onClick={closeBudgetCategoryModal} aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <form className="budget-category-form" onSubmit={saveCategory}>
              <label>
                <span>대분류</span>
                <input value={draftCategory.name} onChange={(event) => setDraftCategory({ name: event.target.value })} placeholder="예: 식장" />
              </label>
              <button className="modal-save" type="submit">추가</button>
            </form>

            {categoryMessage && <p className="category-message">{categoryMessage}</p>}
            {categoryNotice && <p className="category-notice">{categoryNotice}</p>}

            <div className="modal-budget-info">
              <span>나의 예산</span>
              <strong>가용 {currency(assetTotals.available)} / 전체 {currency(assetTotals.total)}</strong>
            </div>

            <div className="category-list">
              {categories.length === 0 ? (
                <p>등록된 대분류가 없습니다.</p>
              ) : categories.map((category) => (
                <div className="budget-category-edit-row" key={category.id}>
                  <input value={category.name} onChange={(event) => updateCategoryLocal(category.id, 'name', event.target.value)} />
                  <input
                    type="number"
                    value={category.allocatedAmount ?? 0}
                    onChange={(event) => updateCategoryLocal(category.id, 'allocatedAmount', event.target.value)}
                    aria-label={`${category.name} 배정금액`}
                  />
                  <span className="readonly-metric">{currency(summaries.find((summary) => summary.category.id === category.id)?.spent ?? 0)}</span>
                  <span className="readonly-metric">
                    {currency(Number(category.allocatedAmount || 0) - (summaries.find((summary) => summary.category.id === category.id)?.spent ?? 0))}
                  </span>
                  <button type="button" onClick={() => updateCategory(category)}>저장</button>
                  <button className="category-delete-button" type="button" onClick={() => deleteCategory(category)}>삭제</button>
                </div>
              ))}
            </div>
            <p>배정금액은 대분류별 요약에서 상세 지출합계와 비교됩니다. 예산 항목이 있는 대분류는 삭제할 수 없습니다.</p>
          </section>
        </div>
      )}

      {isAssetModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBudgetAssetModal();
            }
          }}
        >
          <section className="category-modal budget-asset-modal">
            <div className="modal-title-row">
              <h2>나의 예산 관리</h2>
              <button className="icon-button" type="button" onClick={closeBudgetAssetModal} aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <div className="modal-budget-info">
              <span>합계</span>
              <strong>가용 {currency(assetTotals.available)} / 전체 {currency(assetTotals.total)}</strong>
            </div>

            {assetMessage && <p className="category-message">{assetMessage}</p>}
            {assetNotice && (
              <p className="category-notice">
                {assetNotice}
                {assetExcelDownload && (
                  <a className="download-link" href={assetExcelDownload.url} download={assetExcelDownload.filename}>
                    파일 받기
                  </a>
                )}
              </p>
            )}

            <div className="table-toolbar asset-modal-toolbar">
              <span className={`pending-inline ${hasAssetPendingChanges ? 'active' : ''}`}>
                {[
                  assetNewCount > 0 ? `신규 ${assetNewCount}건` : '',
                  assetEditCount > 0 ? `수정 ${assetEditCount}건` : ''
                ].filter(Boolean).join(', ') || '저장 전 변경 없음'}
              </span>
              <div className="table-toolbar-actions">
                <button className="small-action" type="button" onClick={addAsset}>
                  <Plus size={14} /> 행 추가
                </button>
                <button className="small-action" type="button" onClick={openAssetPasteModal}>엑셀 붙여넣기</button>
                <button className="small-action" type="button" onClick={downloadAssetsExcel}>엑셀 다운로드</button>
                <button className="small-delete" type="button" onClick={deleteSelectedAssets}>삭제</button>
                <button className={`small-save ${hasAssetPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveAssets}>저장</button>
              </div>
            </div>

            <div className="grid-table-wrap asset-table-wrap">
              <table className="budget-table asset-table">
                <thead>
                  <tr>
                    <th className="check-column">
                      <PrettyCheckbox checked={isAllAssetsSelected} onChange={toggleAllAssets} tone="danger" />
                    </th>
                    <th>소유자</th>
                    <th>구분</th>
                    <th>자산명</th>
                    <th>금액</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length === 0 && (
                    <tr>
                      <td className="empty-table" colSpan="6">
                        <strong>등록된 나의 예산이 없습니다.</strong>
                        <span>행 추가로 가용/비가용 예산을 입력하세요.</span>
                      </td>
                    </tr>
                  )}
                  {assets.map((asset) => (
                    <tr key={asset.id} className={asset.isNew ? 'new-row' : ''}>
                      <td className="check-column">
                        <PrettyCheckbox
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={(checked) => toggleAssetSelection(asset.id, checked)}
                          tone="danger"
                        />
                      </td>
                      <td>
                        <input value={asset.owner ?? ''} onChange={(event) => updateAsset(asset.id, 'owner', event.target.value)} placeholder="신랑" />
                      </td>
                      <td>
                        <select value={asset.availability ?? '가용'} onChange={(event) => updateAsset(asset.id, 'availability', event.target.value)}>
                          <option value="가용">가용</option>
                          <option value="비가용">비가용</option>
                        </select>
                      </td>
                      <td>
                        <input value={asset.assetName ?? ''} onChange={(event) => updateAsset(asset.id, 'assetName', event.target.value)} placeholder="예금" />
                      </td>
                      <td>
                        <input type="number" value={asset.amount ?? 0} onChange={(event) => updateAsset(asset.id, 'amount', event.target.value)} />
                      </td>
                      <td>
                        <input value={asset.note ?? ''} onChange={(event) => updateAsset(asset.id, 'note', event.target.value)} placeholder="비고" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {isPasteModalOpen && (
        <PasteModal
          title="예산 상세 내역 엑셀 붙여넣기"
          guide="대분류  세부항목  지출(원)  비고"
          example={'식장\t대관료\t4000000\t메모'}
          value={pasteText}
          message={pasteMessage}
          onChange={setPasteText}
          onClose={() => setIsPasteModalOpen(false)}
          onApply={applyPastedBudgetItems}
        />
      )}

      {isAssetPasteModalOpen && (
        <PasteModal
          title="나의 예산 엑셀 붙여넣기"
          guide="소유자  구분  자산명  금액  비고"
          example={'신랑\t가용\t예금\t1000000\t메모'}
          value={assetPasteText}
          message={assetPasteMessage}
          onChange={setAssetPasteText}
          onClose={() => setIsAssetPasteModalOpen(false)}
          onApply={applyPastedAssets}
        />
      )}
    </main>
  );
}

const weddingHallEmpty = {
  venueName: '',
  region: '',
  address: '',
  nearestStation: '',
  shuttle: false,
  standalone: false,
  hallName: '',
  mood: '어두움',
  rentalFee: 0,
  directingFee: 0,
  minPeople: 0,
  maxPeople: 0,
  mealFee: 0,
  mealType: '',
  weddingStyle: '분리',
  ceremonyTime: '',
  flowerFee: 0,
  parking: '',
  parkingFee: '',
  minAmount: 0,
  maxAmount: 0,
  note: '',
  sortOrder: 0
};

function WeddingHallPage() {
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [filters, setFilters] = useState({ venueName: '', region: '', mood: '' });
  const [isSimpleView, setIsSimpleView] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useExcelDownloadLink();

  const visibleRows = useMemo(() => rows.filter((row) => (
    (!filters.venueName || (row.venueName ?? '').includes(filters.venueName))
    && (!filters.region || (row.region ?? '').includes(filters.region))
    && (!filters.mood || row.mood === filters.mood)
  )).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [filters, rows]);
  const visibleIds = visibleRows.map((row) => row.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const newCount = rows.filter((row) => row.isNew).length;
  const editCount = dirtyIds.length;
  const hasPendingChanges = newCount > 0 || editCount > 0;
  const pendingText = [
    newCount > 0 ? `신규 ${newCount}건` : '',
    editCount > 0 ? `수정 ${editCount}건` : ''
  ].filter(Boolean).join(', ') || '저장 전 변경 없음';

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options
    });
    const text = await response.text();
    if (!response.ok) {
      let errorMessage = '요청 처리에 실패했습니다.';
      if (text) {
        try {
          errorMessage = JSON.parse(text).message ?? errorMessage;
        } catch {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }
    if (response.status === 204) return null;
    return text ? JSON.parse(text) : null;
  }

  async function loadRows() {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api('/api/wedding-halls');
      setRows(data.items ?? []);
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateRow(rowId, field, value) {
    const tableWrap = document.querySelector('.wedding-hall-table')?.closest('.vendor-table-wrap');
    const scrollLeft = tableWrap?.scrollLeft ?? 0;
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
    if (typeof rowId === 'number') {
      setDirtyIds((current) => current.includes(rowId) ? current : [...current, rowId]);
    }
    window.requestAnimationFrame(() => {
      const nextTableWrap = document.querySelector('.wedding-hall-table')?.closest('.vendor-table-wrap');
      if (nextTableWrap) {
        nextTableWrap.scrollLeft = scrollLeft;
      }
    });
  }

  function addRow() {
    setRows((current) => [{ ...weddingHallEmpty, id: `new-${Date.now()}`, sortOrder: current.length, isNew: true }, ...current]);
    setNotice('');
  }

  function applyPastedRows() {
    const { lines, hasHeader, headerMap } = parsePastedTable(pasteText, [
      '예식장', '지역', '상세주소', '가까운역', '셔틀유무', '단독건물여부', '웨딩홀', '홀분위기',
      '대관료', '연출료', '최소인원', '최대인원', '식대', '식사종류', '웨딩형식', '시간',
      '꽃금액', '주차', '주차비/시간', '최소금액', '최대금액', '비고'
    ]);
    if (lines.length === 0) {
      setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.');
      return;
    }
    const nextRows = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const venueName = String(pastedValue(values, headerMap, ['예식장'], 0)).trim();
      if (!venueName) {
        errors.push(`${rowNumber}행: 예식장이 비어 있습니다.`);
        return;
      }
      nextRows.push({
        ...weddingHallEmpty,
        id: makeNewId('new-wedding-hall'),
        venueName,
        region: String(pastedValue(values, headerMap, ['지역'], 1)).trim(),
        address: String(pastedValue(values, headerMap, ['상세주소'], 2)).trim(),
        nearestStation: String(pastedValue(values, headerMap, ['가까운역'], 3)).trim(),
        shuttle: parseBoolean(pastedValue(values, headerMap, ['셔틀유무', '셔틀'], 4)),
        standalone: parseBoolean(pastedValue(values, headerMap, ['단독건물여부', '단독건물'], 5)),
        hallName: String(pastedValue(values, headerMap, ['웨딩홀'], 6)).trim(),
        mood: String(pastedValue(values, headerMap, ['홀분위기'], 7)).trim() || '어두움',
        rentalFee: parseAmount(pastedValue(values, headerMap, ['대관료'], 8)),
        directingFee: parseAmount(pastedValue(values, headerMap, ['연출료'], 9)),
        minPeople: parseAmount(pastedValue(values, headerMap, ['최소인원'], 10)),
        maxPeople: parseAmount(pastedValue(values, headerMap, ['최대인원'], 11)),
        mealFee: parseAmount(pastedValue(values, headerMap, ['식대'], 12)),
        mealType: String(pastedValue(values, headerMap, ['식사종류'], 13)).trim(),
        weddingStyle: String(pastedValue(values, headerMap, ['웨딩형식'], 14)).trim() || '분리',
        ceremonyTime: String(pastedValue(values, headerMap, ['시간'], 15)).trim(),
        flowerFee: parseAmount(pastedValue(values, headerMap, ['꽃금액'], 16)),
        parking: String(pastedValue(values, headerMap, ['주차'], 17)).trim(),
        parkingFee: String(pastedValue(values, headerMap, ['주차비/시간', '주차비'], 18)).trim(),
        minAmount: parseAmount(pastedValue(values, headerMap, ['최소금액'], 19)),
        maxAmount: parseAmount(pastedValue(values, headerMap, ['최대금액'], 20)),
        note: String(pastedValue(values, headerMap, ['비고', '메모'], 21)).trim(),
        sortOrder: rows.length + index,
        isNew: true
      });
    });
    if (errors.length > 0) {
      setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''));
      return;
    }
    if (nextRows.length === 0) {
      setPasteMessage('추가할 웨딩홀이 없습니다.');
      return;
    }
    setRows((current) => [...nextRows, ...current]);
    setNotice(`엑셀 붙여넣기로 신규 ${nextRows.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsPasteModalOpen(false);
    setPasteText('');
    setPasteMessage('');
  }

  async function downloadWeddingHallExcel() {
    if (visibleRows.length === 0) {
      setNotice('다운로드할 웨딩홀 데이터가 없습니다.');
      return;
    }
    setMessage('');
    setNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_웨딩홀',
        sheets: [{
          name: '웨딩홀',
          columns: [
            { header: '예식장', key: 'venueName', width: 24 },
            { header: '지역', key: 'region', width: 16 },
            { header: '상세주소', key: 'address', width: 36 },
            { header: '가까운역', key: 'nearestStation', width: 18 },
            { header: '셔틀유무', key: 'shuttle', width: 12 },
            { header: '단독건물여부', key: 'standalone', width: 14 },
            { header: '웨딩홀', key: 'hallName', width: 22 },
            { header: '홀분위기', key: 'mood', width: 12 },
            { header: '대관료', key: 'rentalFee', width: 14, numFmt: '#,##0"원"' },
            { header: '연출료', key: 'directingFee', width: 14, numFmt: '#,##0"원"' },
            { header: '최소인원', key: 'minPeople', width: 12 },
            { header: '최대인원', key: 'maxPeople', width: 12 },
            { header: '식대', key: 'mealFee', width: 14, numFmt: '#,##0"원"' },
            { header: '식사종류', key: 'mealType', width: 14 },
            { header: '웨딩형식', key: 'weddingStyle', width: 12 },
            { header: '시간', key: 'ceremonyTime', width: 12 },
            { header: '꽃금액', key: 'flowerFee', width: 14, numFmt: '#,##0"원"' },
            { header: '주차', key: 'parking', width: 14 },
            { header: '주차비/시간', key: 'parkingFee', width: 16 },
            { header: '최소금액', key: 'minAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '최대금액', key: 'maxAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '비고', key: 'note', width: 40 }
          ],
          rows: visibleRows.map((row) => ({
            ...row,
            shuttle: row.shuttle ? 'Y' : 'N',
            standalone: row.standalone ? 'Y' : 'N'
          }))
        }]
      });
      setExcelDownload(download);
      setNotice(`${visibleRows.length}건의 웨딩홀 엑셀 파일을 생성했습니다.`);
    } catch (error) {
      setNotice('');
      setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
    }
  }

  function startEditing(rowId, field) {
    setEditingCell({ rowId, field });
  }

  function finishEditing() {
    setEditingCell(null);
  }

  function isEditing(rowId, field) {
    return editingCell?.rowId === rowId && editingCell?.field === field;
  }

  function normalizeSort(nextRows) {
    const normalized = nextRows.map((row, index) => ({ ...row, sortOrder: index }));
    setRows(normalized);
    setDirtyIds((current) => {
      const dirty = new Set(current);
      normalized.forEach((row) => {
        if (typeof row.id === 'number') dirty.add(row.id);
      });
      return Array.from(dirty);
    });
  }

  function dropRow(targetRow) {
    if (!draggedId || draggedId === targetRow.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const dragged = rows.find((row) => row.id === draggedId);
    if (!dragged) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const withoutDragged = rows.filter((row) => row.id !== draggedId);
    const targetIndex = withoutDragged.findIndex((row) => row.id === targetRow.id);
    const nextRows = [...withoutDragged];
    nextRows.splice(targetIndex < 0 ? nextRows.length : targetIndex, 0, dragged);
    normalizeSort(nextRows);
    setDraggedId(null);
    setDragOverId(null);
  }

  function serialize(row) {
    const numberFields = [
      'rentalFee',
      'directingFee',
      'minPeople',
      'maxPeople',
      'mealFee',
      'flowerFee',
      'minAmount',
      'maxAmount'
    ];
    const next = { ...row, sortOrder: Number(row.sortOrder || 0) };
    numberFields.forEach((field) => {
      next[field] = Number(next[field] || 0);
    });
    return next;
  }

  async function saveRows() {
    const newRows = rows.filter((row) => row.isNew);
    const dirtyRows = rows.filter((row) => !row.isNew && dirtyIds.includes(row.id));
    if (newRows.length === 0 && dirtyRows.length === 0) {
      setNotice('저장할 변경사항이 없습니다.');
      return;
    }
    setMessage('');
    setNotice('');
    try {
      const created = await Promise.all(newRows.map((row) => api('/api/wedding-halls', {
        method: 'POST',
        body: JSON.stringify(serialize(row))
      })));
      const updated = await Promise.all(dirtyRows.map((row) => api(`/api/wedding-halls/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify(serialize(row))
      })));
      setRows((current) => {
        const createdQueue = [...created];
        return current.map((row) => {
          const saved = updated.find((item) => item.id === row.id);
          if (saved) return saved;
          if (!row.isNew) return row;
          return createdQueue.shift();
        });
      });
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
      setNotice(`${created.length + updated.length}개 웨딩홀 정보를 저장했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      setNotice('삭제할 웨딩홀을 선택하세요.');
      return;
    }
    const persistedIds = selectedIds.filter((id) => typeof id === 'number');
    setMessage('');
    setNotice('');
    try {
      if (persistedIds.length > 0) {
        await api('/api/wedding-halls', { method: 'DELETE', body: JSON.stringify(persistedIds) });
      }
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setDirtyIds((current) => current.filter((id) => !selectedIds.includes(id)));
      setSelectedIds([]);
      setNotice(`${selectedIds.length}개 웨딩홀 정보를 삭제했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function renderEditableCell(row, field, type = 'text', placeholder = '', options) {
    const editable = row.isNew || isEditing(row.id, field);
    if (!editable) {
      return <span className="read-text" onDoubleClick={() => startEditing(row.id, field)}>{type === 'money' ? currency(row[field]) : (row[field] || '-')}</span>;
    }
    if (options) {
      return (
        <select value={row[field] ?? ''} onBlur={finishEditing} onChange={(event) => updateRow(row.id, field, event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    return (
      <input
        autoFocus={!row.isNew}
        type={type === 'money' || type === 'number' ? 'number' : 'text'}
        value={row[field] ?? ''}
        placeholder={placeholder}
        onBlur={finishEditing}
        onChange={(event) => updateRow(row.id, field, type === 'money' || type === 'number' ? event.target.value : event.target.value)}
      />
    );
  }

  useEffect(() => {
    loadRows();
  }, []);

  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Power 프로젝트</p>
          <div className="title-row">
            <h1>웨딩홀</h1>
            <PrettyCheckbox checked={isSimpleView} onChange={setIsSimpleView} label="간단하게 보기" />
          </div>
          <p className="summary">웨딩홀 후보의 비용, 위치, 조건을 비교합니다.</p>
        </div>
        <button className="icon-button" type="button" onClick={loadRows} disabled={isLoading} aria-label="새로고침">
          <RefreshCw size={18} />
        </button>
      </section>
      <button className="filter-toggle" type="button" onClick={() => setIsFilterOpen((current) => !current)}>{isFilterOpen ? '필터 접기' : '필터 펼치기'}</button>
      <section className={`filter-strip ${isFilterOpen ? 'open' : 'collapsed'}`}>
        <label><span>예식장</span><input value={filters.venueName} onChange={(event) => setFilters((current) => ({ ...current, venueName: event.target.value }))} /></label>
        <label><span>지역</span><input value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value }))} /></label>
        <label><span>홀분위기</span><select value={filters.mood} onChange={(event) => setFilters((current) => ({ ...current, mood: event.target.value }))}><option value="">전체</option><option value="어두움">어두움</option><option value="밝음">밝음</option></select></label>
        <button className="filter-search" type="button" onClick={loadRows}>조회</button>
      </section>
      {message && <p className="message">{message}</p>}
      <DownloadNotice message={notice} download={excelDownload} />
      <section className="table-panel">
        <div className="table-toolbar">
          <span className={`pending-inline ${hasPendingChanges ? 'active' : ''}`}>{pendingText}</span>
          <div className="table-toolbar-actions">
            <button className="small-action" type="button" onClick={addRow}><Plus size={14} /> 행 추가</button>
            <button className="small-action" type="button" onClick={() => { setPasteText(''); setPasteMessage(''); setIsPasteModalOpen(true); }}>엑셀 붙여넣기</button>
            <button className="small-action" type="button" onClick={downloadWeddingHallExcel}>엑셀 다운로드</button>
            <button className="small-delete" type="button" onClick={deleteSelected}>삭제</button>
            <button className={`small-save ${hasPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveRows}>저장</button>
          </div>
        </div>
        <div className="grid-table-wrap vendor-table-wrap">
          <table className={`vendor-table wedding-hall-table ${isSimpleView ? 'simple-view' : 'full-view'}`}>
            <thead>
              <tr>
                <th>로우선택</th><th><PrettyCheckbox checked={isAllSelected} onChange={(checked) => setSelectedIds(checked ? visibleIds : [])} tone="danger" /></th>
                <th>예식장</th><th>지역</th>{!isSimpleView && <><th>상세주소</th><th>가까운역</th><th>셔틀</th><th>단독건물</th><th>웨딩홀</th></>}<th>홀분위기</th><th>대관료</th><th>연출료</th><th>최소인원</th>{!isSimpleView && <th>최대인원</th>}<th>식대</th>{!isSimpleView && <><th>식사종류</th><th>웨딩형식</th><th>시간</th><th>꽃금액</th><th>주차</th><th>주차비/시간</th></>}<th>최소금액</th>{!isSimpleView && <th>최대금액</th>}<th>비고</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && <tr><td className="empty-table" colSpan={isSimpleView ? 11 : 24}><strong>표시할 웨딩홀이 없습니다.</strong><span>행 추가로 후보를 입력하세요.</span></td></tr>}
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className={`${row.isNew ? 'new-row' : ''} ${draggedId && dragOverId === row.id && draggedId !== row.id ? 'drag-over-row' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverId(row.id);
                  }}
                  onDragLeave={() => setDragOverId((current) => current === row.id ? null : current)}
                  onDrop={() => dropRow(row)}
                >
                  <td
                    className="drag-column"
                    draggable
                    onDragStart={() => {
                      setDraggedId(row.id);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                  ><GripVertical size={16} /></td>
                  <td className="check-column"><PrettyCheckbox checked={selectedIds.includes(row.id)} onChange={(checked) => setSelectedIds((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} tone="danger" /></td>
                  <td>{renderEditableCell(row, 'venueName', 'text', '예식장')}</td>
                  <td>{renderEditableCell(row, 'region', 'text', '지역')}</td>
                  {!isSimpleView && <><td>{renderEditableCell(row, 'address')}</td><td>{renderEditableCell(row, 'nearestStation')}</td><td className="check-column"><PrettyCheckbox checked={row.shuttle} onChange={(checked) => updateRow(row.id, 'shuttle', checked)} /></td><td className="check-column"><PrettyCheckbox checked={row.standalone} onChange={(checked) => updateRow(row.id, 'standalone', checked)} /></td><td>{renderEditableCell(row, 'hallName')}</td></>}
                  <td>{renderEditableCell(row, 'mood', 'text', '', ['어두움', '밝음'])}</td>
                  <td>{renderEditableCell(row, 'rentalFee', 'money')}</td>
                  <td>{renderEditableCell(row, 'directingFee', 'money')}</td>
                  <td>{renderEditableCell(row, 'minPeople', 'number')}</td>
                  {!isSimpleView && <td>{renderEditableCell(row, 'maxPeople', 'number')}</td>}
                  <td>{renderEditableCell(row, 'mealFee', 'money')}</td>
                  {!isSimpleView && <><td>{renderEditableCell(row, 'mealType')}</td><td>{renderEditableCell(row, 'weddingStyle', 'text', '', ['분리', '동시'])}</td><td>{renderEditableCell(row, 'ceremonyTime', 'text', '70분')}</td><td>{renderEditableCell(row, 'flowerFee', 'money')}</td><td>{renderEditableCell(row, 'parking', 'text', '700대')}</td><td>{renderEditableCell(row, 'parkingFee')}</td></>}
                  <td>{renderEditableCell(row, 'minAmount', 'money')}</td>
                  {!isSimpleView && <td>{renderEditableCell(row, 'maxAmount', 'money')}</td>}
                  <td>{row.isNew || isEditing(row.id, 'note') ? <textarea value={row.note ?? ''} onBlur={finishEditing} onChange={(event) => updateRow(row.id, 'note', event.target.value)} placeholder="비고" /> : <span className="read-text memo-text multi-line" onDoubleClick={() => startEditing(row.id, 'note')}>{row.note || '-'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {isPasteModalOpen && (
        <PasteModal
          title="웨딩홀 엑셀 붙여넣기"
          guide="예식장  지역  상세주소  가까운역  셔틀유무  단독건물여부  웨딩홀  홀분위기  대관료  연출료  최소인원  최대인원  식대  식사종류  웨딩형식  시간  꽃금액  주차  주차비/시간  최소금액  최대금액  비고"
          example={'웨딩홀A\t서울\t상세주소\t강남역\tY\tN\t그랜드홀\t밝음\t1000000\t500000\t100\t200\t70000\t뷔페\t분리\t70분\t300000\t700대\t무료 2시간\t10000000\t15000000\t메모'}
          value={pasteText}
          message={pasteMessage}
          onChange={setPasteText}
          onClose={() => setIsPasteModalOpen(false)}
          onApply={applyPastedRows}
        />
      )}
    </main>
  );
}

function SdmPage() {
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useExcelDownloadLink();
  const visibleIds = rows.map((row) => row.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const newCount = rows.filter((row) => row.isNew).length;
  const editCount = dirtyIds.length;
  const hasPendingChanges = newCount > 0 || editCount > 0;
  const pendingText = [newCount > 0 ? `신규 ${newCount}건` : '', editCount > 0 ? `수정 ${editCount}건` : ''].filter(Boolean).join(', ') || '저장 전 변경 없음';

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }, ...options });
    const text = await response.text();
    if (!response.ok) throw new Error(text ? JSON.parse(text).message ?? text : '요청 처리에 실패했습니다.');
    if (response.status === 204) return null;
    return text ? JSON.parse(text) : null;
  }
  async function loadRows() {
    setIsLoading(true); setMessage('');
    try { const data = await api('/api/sdm'); setRows(data.items ?? []); setDirtyIds([]); setSelectedIds([]); setEditingCell(null); }
    catch (error) { setMessage(error.message); } finally { setIsLoading(false); }
  }
  function updateRow(rowId, field, value) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
    if (typeof rowId === 'number') setDirtyIds((current) => current.includes(rowId) ? current : [...current, rowId]);
  }
  function addRow() {
    setRows((current) => [{ id: `new-${Date.now()}`, companyName: '', location: '', studioAmount: '', dressAmount: '', makeupAmount: '', memo: '', sortOrder: current.length, isNew: true }, ...current]);
    setNotice('');
  }
  function applyPastedRows() {
    const { lines, hasHeader, headerMap } = parsePastedTable(pasteText, ['업체명', '위치', '스튜디오', '드레스', '메이크업', '메모']);
    if (lines.length === 0) { setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.'); return; }
    const nextRows = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const companyName = String(pastedValue(values, headerMap, ['업체명'], 0)).trim();
      if (!companyName) {
        errors.push(`${rowNumber}행: 업체명이 비어 있습니다.`);
        return;
      }
      nextRows.push({
        id: makeNewId('new-sdm'),
        companyName,
        location: String(pastedValue(values, headerMap, ['위치'], 1)).trim(),
        studioAmount: parseAmount(pastedValue(values, headerMap, ['스튜디오'], 2)),
        dressAmount: parseAmount(pastedValue(values, headerMap, ['드레스'], 3)),
        makeupAmount: parseAmount(pastedValue(values, headerMap, ['메이크업'], 4)),
        memo: String(pastedValue(values, headerMap, ['메모', '비고'], 5)).trim(),
        sortOrder: rows.length + index,
        isNew: true
      });
    });
    if (errors.length > 0) { setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : '')); return; }
    if (nextRows.length === 0) { setPasteMessage('추가할 스드메가 없습니다.'); return; }
    setRows((current) => [...nextRows, ...current]);
    setNotice(`엑셀 붙여넣기로 신규 ${nextRows.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsPasteModalOpen(false); setPasteText(''); setPasteMessage('');
  }
  async function downloadSdmExcel() {
    if (rows.length === 0) { setNotice('다운로드할 스드메 데이터가 없습니다.'); return; }
    setMessage(''); setNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_스드메',
        sheets: [{
          name: '스드메',
          columns: [
            { header: '업체명', key: 'companyName', width: 22 },
            { header: '위치', key: 'location', width: 28 },
            { header: '스튜디오', key: 'studioAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '드레스', key: 'dressAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '메이크업', key: 'makeupAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '합계금액', key: 'totalAmount', width: 14, numFmt: '#,##0"원"' },
            { header: '메모', key: 'memo', width: 40 }
          ],
          rows: rows.map((row) => ({
            ...row,
            studioAmount: Number(row.studioAmount || 0),
            dressAmount: Number(row.dressAmount || 0),
            makeupAmount: Number(row.makeupAmount || 0),
            totalAmount: Number(row.studioAmount || 0) + Number(row.dressAmount || 0) + Number(row.makeupAmount || 0)
          }))
        }]
      });
      setExcelDownload(download);
      setNotice(`${rows.length}건의 스드메 엑셀 파일을 생성했습니다.`);
    } catch (error) { setNotice(''); setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.'); }
  }
  function reorder(targetRow) {
    if (!draggedId || draggedId === targetRow.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const dragged = rows.find((row) => row.id === draggedId);
    if (!dragged) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const rest = rows.filter((row) => row.id !== draggedId);
    const targetIndex = rest.findIndex((row) => row.id === targetRow.id);
    const next = [...rest];
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragged);
    const normalized = next.map((row, index) => ({ ...row, sortOrder: index }));
    setRows(normalized);
    setDirtyIds((current) => Array.from(new Set([...current, ...normalized.filter((row) => typeof row.id === 'number').map((row) => row.id)])));
    setDraggedId(null);
    setDragOverId(null);
  }
  function serialize(row) {
    return {
      ...row,
      studioAmount: Number(row.studioAmount || 0),
      dressAmount: Number(row.dressAmount || 0),
      makeupAmount: Number(row.makeupAmount || 0),
      sortOrder: Number(row.sortOrder || 0)
    };
  }
  async function saveRows() {
    const newRows = rows.filter((row) => row.isNew);
    const dirtyRows = rows.filter((row) => !row.isNew && dirtyIds.includes(row.id));
    if (newRows.length === 0 && dirtyRows.length === 0) { setNotice('저장할 변경사항이 없습니다.'); return; }
    setMessage(''); setNotice('');
    try {
      const created = await Promise.all(newRows.map((row) => api('/api/sdm', { method: 'POST', body: JSON.stringify(serialize(row)) })));
      const updated = await Promise.all(dirtyRows.map((row) => api(`/api/sdm/${row.id}`, { method: 'PUT', body: JSON.stringify(serialize(row)) })));
      setRows((current) => { const queue = [...created]; return current.map((row) => updated.find((item) => item.id === row.id) ?? (!row.isNew ? row : queue.shift())); });
      setDirtyIds([]); setSelectedIds([]); setEditingCell(null); setNotice(`${created.length + updated.length}개 스드메 정보를 저장했습니다.`);
    } catch (error) { setMessage(error.message); }
  }
  async function deleteSelected() {
    if (selectedIds.length === 0) { setNotice('삭제할 스드메를 선택하세요.'); return; }
    const persistedIds = selectedIds.filter((id) => typeof id === 'number');
    setMessage(''); setNotice('');
    try {
      if (persistedIds.length > 0) await api('/api/sdm', { method: 'DELETE', body: JSON.stringify(persistedIds) });
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setDirtyIds((current) => current.filter((id) => !selectedIds.includes(id)));
      setSelectedIds([]); setNotice(`${selectedIds.length}개 스드메 정보를 삭제했습니다.`);
    } catch (error) { setMessage(error.message); }
  }
  function cell(row, field, type = 'text') {
    const editing = row.isNew || (editingCell?.rowId === row.id && editingCell?.field === field);
    if (!editing) return <span className="read-text" onDoubleClick={() => setEditingCell({ rowId: row.id, field })}>{type === 'money' ? currency(row[field]) : (row[field] || '-')}</span>;
    return <input autoFocus={!row.isNew} type={type === 'money' ? 'number' : 'text'} value={row[field] ?? ''} onBlur={() => setEditingCell(null)} onChange={(event) => updateRow(row.id, field, event.target.value)} />;
  }
  useEffect(() => { loadRows(); }, []);
  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div><p className="eyebrow">Power 프로젝트</p><h1>스드메</h1><p className="summary">스튜디오, 드레스, 메이크업 업체 견적을 비교합니다.</p></div>
        <button className="icon-button" type="button" onClick={loadRows} disabled={isLoading} aria-label="새로고침"><RefreshCw size={18} /></button>
      </section>
      {message && <p className="message">{message}</p>}<DownloadNotice message={notice} download={excelDownload} />
      <section className="table-panel">
        <div className="table-toolbar"><span className={`pending-inline ${hasPendingChanges ? 'active' : ''}`}>{pendingText}</span><div className="table-toolbar-actions"><button className="small-action" type="button" onClick={addRow}><Plus size={14} /> 행 추가</button><button className="small-action" type="button" onClick={() => { setPasteText(''); setPasteMessage(''); setIsPasteModalOpen(true); }}>엑셀 붙여넣기</button><button className="small-action" type="button" onClick={downloadSdmExcel}>엑셀 다운로드</button><button className="small-delete" type="button" onClick={deleteSelected}>삭제</button><button className={`small-save ${hasPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveRows}>저장</button></div></div>
        <div className="grid-table-wrap vendor-table-wrap"><table className="vendor-table sdm-table"><thead><tr><th>로우선택</th><th><PrettyCheckbox checked={isAllSelected} onChange={(checked) => setSelectedIds(checked ? visibleIds : [])} tone="danger" /></th><th>업체명</th><th>위치</th><th>스튜디오</th><th>드레스</th><th>메이크업</th><th>합계금액</th><th>메모</th></tr></thead><tbody>{rows.length === 0 && <tr><td className="empty-table" colSpan="9"><strong>표시할 스드메가 없습니다.</strong><span>행 추가로 업체를 입력하세요.</span></td></tr>}{rows.map((row) => <tr key={row.id} className={`${row.isNew ? 'new-row' : ''} ${draggedId && dragOverId === row.id && draggedId !== row.id ? 'drag-over-row' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragOverId(row.id); }} onDragLeave={() => setDragOverId((current) => current === row.id ? null : current)} onDrop={() => reorder(row)}><td className="drag-column" draggable onDragStart={() => { setDraggedId(row.id); setDragOverId(null); }} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}><GripVertical size={16} /></td><td className="check-column"><PrettyCheckbox checked={selectedIds.includes(row.id)} onChange={(checked) => setSelectedIds((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} tone="danger" /></td><td>{cell(row, 'companyName')}</td><td>{cell(row, 'location')}</td><td>{cell(row, 'studioAmount', 'money')}</td><td>{cell(row, 'dressAmount', 'money')}</td><td>{cell(row, 'makeupAmount', 'money')}</td><td className="readonly-metric">{currency(Number(row.studioAmount || 0) + Number(row.dressAmount || 0) + Number(row.makeupAmount || 0))}</td><td>{row.isNew || (editingCell?.rowId === row.id && editingCell?.field === 'memo') ? <textarea value={row.memo ?? ''} onBlur={() => setEditingCell(null)} onChange={(event) => updateRow(row.id, 'memo', event.target.value)} /> : <span className="read-text memo-text multi-line" onDoubleClick={() => setEditingCell({ rowId: row.id, field: 'memo' })}>{row.memo || '-'}</span>}</td></tr>)}</tbody></table></div>
      </section>
      {isPasteModalOpen && <PasteModal title="스드메 엑셀 붙여넣기" guide="업체명  위치  스튜디오  드레스  메이크업  메모" example={'업체A\t서울\t1000000\t2000000\t500000\t메모'} value={pasteText} message={pasteMessage} onChange={setPasteText} onClose={() => setIsPasteModalOpen(false)} onApply={applyPastedRows} />}
    </main>
  );
}

function HomePage() {
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [excelDownload, setExcelDownload] = useExcelDownloadLink();
  const visibleIds = rows.map((row) => row.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const newCount = rows.filter((row) => row.isNew).length;
  const editCount = dirtyIds.length;
  const hasPendingChanges = newCount > 0 || editCount > 0;
  const pendingText = [newCount > 0 ? `신규 ${newCount}건` : '', editCount > 0 ? `수정 ${editCount}건` : ''].filter(Boolean).join(', ') || '저장 전 변경 없음';

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }, ...options });
    const text = await response.text();
    if (!response.ok) throw new Error(text ? JSON.parse(text).message ?? text : '요청 처리에 실패했습니다.');
    if (response.status === 204) return null;
    return text ? JSON.parse(text) : null;
  }

  async function loadRows() {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api('/api/homes');
      setRows(data.items ?? []);
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateRow(rowId, field, value) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
    if (typeof rowId === 'number') setDirtyIds((current) => current.includes(rowId) ? current : [...current, rowId]);
  }

  function addRow() {
    setRows((current) => [{
      id: `new-${Date.now()}`,
      apartmentName: '',
      location: '',
      supplyArea: '',
      pyeong: '',
      hogangnonoAmount: '',
      naverAmount: '',
      parkingStatus: '',
      sunDirection: '',
      memo: '',
      sortOrder: current.length,
      isNew: true
    }, ...current]);
    setNotice('');
  }

  function applyPastedRows() {
    const { lines, hasHeader, headerMap } = parsePastedTable(pasteText, ['아파트명', '위치', '공급면적', '평수', '호갱노노금액', '네이버금액', '주차공간', '해방향', '메모']);
    if (lines.length === 0) { setPasteMessage('붙여넣을 엑셀 데이터를 입력하세요.'); return; }
    const nextRows = [];
    const errors = [];
    lines.forEach((line, index) => {
      const values = line.split('\t');
      const rowNumber = index + 1 + (hasHeader ? 1 : 0);
      const apartmentName = String(pastedValue(values, headerMap, ['아파트명'], 0)).trim();
      if (!apartmentName) {
        errors.push(`${rowNumber}행: 아파트명이 비어 있습니다.`);
        return;
      }
      nextRows.push({
        id: makeNewId('new-home'),
        apartmentName,
        location: String(pastedValue(values, headerMap, ['위치'], 1)).trim(),
        supplyArea: String(pastedValue(values, headerMap, ['공급면적'], 2)).trim(),
        pyeong: String(pastedValue(values, headerMap, ['평수'], 3)).trim(),
        hogangnonoAmount: parseAmount(pastedValue(values, headerMap, ['호갱노노금액', '호갱노노 금액'], 4)),
        naverAmount: parseAmount(pastedValue(values, headerMap, ['네이버금액', '네이버 금액'], 5)),
        parkingStatus: String(pastedValue(values, headerMap, ['주차공간'], 6)).trim(),
        sunDirection: String(pastedValue(values, headerMap, ['해방향'], 7)).trim(),
        memo: String(pastedValue(values, headerMap, ['메모', '비고'], 8)).trim(),
        sortOrder: rows.length + index,
        isNew: true
      });
    });
    if (errors.length > 0) { setPasteMessage(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n외 ${errors.length - 5}건` : '')); return; }
    if (nextRows.length === 0) { setPasteMessage('추가할 보금자리가 없습니다.'); return; }
    setRows((current) => [...nextRows, ...current]);
    setNotice(`엑셀 붙여넣기로 신규 ${nextRows.length}건을 추가했습니다. 저장 버튼을 눌러 DB에 반영하세요.`);
    setIsPasteModalOpen(false); setPasteText(''); setPasteMessage('');
  }

  async function downloadHomeExcel() {
    if (rows.length === 0) { setNotice('다운로드할 보금자리 데이터가 없습니다.'); return; }
    setMessage(''); setNotice('엑셀 파일을 생성하고 있습니다.');
    try {
      const download = await createExcelDownload({
        filenamePrefix: 'power_보금자리',
        sheets: [{
          name: '보금자리',
          columns: [
            { header: '아파트명', key: 'apartmentName', width: 24 },
            { header: '위치', key: 'location', width: 28 },
            { header: '공급면적', key: 'supplyArea', width: 14 },
            { header: '평수', key: 'pyeong', width: 12 },
            { header: '호갱노노 금액', key: 'hogangnonoAmount', width: 16, numFmt: '#,##0"원"' },
            { header: '네이버 금액', key: 'naverAmount', width: 16, numFmt: '#,##0"원"' },
            { header: '주차공간', key: 'parkingStatus', width: 12 },
            { header: '해방향', key: 'sunDirection', width: 14 },
            { header: '메모', key: 'memo', width: 40 }
          ],
          rows: rows.map((row) => ({
            ...row,
            hogangnonoAmount: Number(row.hogangnonoAmount || 0),
            naverAmount: Number(row.naverAmount || 0)
          }))
        }]
      });
      setExcelDownload(download);
      setNotice(`${rows.length}건의 보금자리 엑셀 파일을 생성했습니다.`);
    } catch (error) { setNotice(''); setMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.'); }
  }

  function reorder(targetRow) {
    if (!draggedId || draggedId === targetRow.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const dragged = rows.find((row) => row.id === draggedId);
    if (!dragged) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const rest = rows.filter((row) => row.id !== draggedId);
    const targetIndex = rest.findIndex((row) => row.id === targetRow.id);
    const next = [...rest];
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragged);
    const normalized = next.map((row, index) => ({ ...row, sortOrder: index }));
    setRows(normalized);
    setDirtyIds((current) => Array.from(new Set([...current, ...normalized.filter((row) => typeof row.id === 'number').map((row) => row.id)])));
    setDraggedId(null);
    setDragOverId(null);
  }

  function serialize(row) {
    return {
      ...row,
      hogangnonoAmount: Number(row.hogangnonoAmount || 0),
      naverAmount: Number(row.naverAmount || 0),
      sortOrder: Number(row.sortOrder || 0)
    };
  }

  async function saveRows() {
    const newRows = rows.filter((row) => row.isNew);
    const dirtyRows = rows.filter((row) => !row.isNew && dirtyIds.includes(row.id));
    if (newRows.length === 0 && dirtyRows.length === 0) {
      setNotice('저장할 변경사항이 없습니다.');
      return;
    }
    setMessage('');
    setNotice('');
    try {
      const created = await Promise.all(newRows.map((row) => api('/api/homes', { method: 'POST', body: JSON.stringify(serialize(row)) })));
      const updated = await Promise.all(dirtyRows.map((row) => api(`/api/homes/${row.id}`, { method: 'PUT', body: JSON.stringify(serialize(row)) })));
      setRows((current) => {
        const queue = [...created];
        return current.map((row) => updated.find((item) => item.id === row.id) ?? (!row.isNew ? row : queue.shift()));
      });
      setDirtyIds([]);
      setSelectedIds([]);
      setEditingCell(null);
      setNotice(`${created.length + updated.length}개 보금자리 정보를 저장했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      setNotice('삭제할 보금자리를 선택하세요.');
      return;
    }
    const persistedIds = selectedIds.filter((id) => typeof id === 'number');
    setMessage('');
    setNotice('');
    try {
      if (persistedIds.length > 0) await api('/api/homes', { method: 'DELETE', body: JSON.stringify(persistedIds) });
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setDirtyIds((current) => current.filter((id) => !selectedIds.includes(id)));
      setSelectedIds([]);
      setNotice(`${selectedIds.length}개 보금자리 정보를 삭제했습니다.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function cell(row, field, type = 'text') {
    const editing = row.isNew || (editingCell?.rowId === row.id && editingCell?.field === field);
    if (!editing) {
      return <span className="read-text" onDoubleClick={() => setEditingCell({ rowId: row.id, field })}>{type === 'money' ? currency(row[field]) : (row[field] || '-')}</span>;
    }
    if (type === 'parking') {
      return (
        <select autoFocus={!row.isNew} value={row[field] ?? ''} onBlur={() => setEditingCell(null)} onChange={(event) => updateRow(row.id, field, event.target.value)}>
          <option value="">선택</option>
          <option value="여유">여유</option>
          <option value="혼잡">혼잡</option>
        </select>
      );
    }
    return <input autoFocus={!row.isNew} type={type === 'money' ? 'number' : 'text'} value={row[field] ?? ''} onBlur={() => setEditingCell(null)} onChange={(event) => updateRow(row.id, field, event.target.value)} />;
  }

  useEffect(() => {
    loadRows();
  }, []);

  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Power 프로젝트</p>
          <h1>보금자리</h1>
          <p className="summary">아파트 후보의 위치, 면적, 가격 정보를 비교합니다.</p>
        </div>
        <button className="icon-button" type="button" onClick={loadRows} disabled={isLoading} aria-label="새로고침"><RefreshCw size={18} /></button>
      </section>
      {message && <p className="message">{message}</p>}
      <DownloadNotice message={notice} download={excelDownload} />
      <section className="table-panel">
        <div className="table-toolbar">
          <span className={`pending-inline ${hasPendingChanges ? 'active' : ''}`}>{pendingText}</span>
          <div className="table-toolbar-actions">
            <button className="small-action" type="button" onClick={addRow}><Plus size={14} /> 행 추가</button>
            <button className="small-action" type="button" onClick={() => { setPasteText(''); setPasteMessage(''); setIsPasteModalOpen(true); }}>엑셀 붙여넣기</button>
            <button className="small-action" type="button" onClick={downloadHomeExcel}>엑셀 다운로드</button>
            <button className="small-delete" type="button" onClick={deleteSelected}>삭제</button>
            <button className={`small-save ${hasPendingChanges ? 'has-pending' : ''}`} type="button" onClick={saveRows}>저장</button>
          </div>
        </div>
        <div className="grid-table-wrap vendor-table-wrap">
          <table className="vendor-table home-table">
            <thead>
              <tr>
                <th>로우선택</th>
                <th><PrettyCheckbox checked={isAllSelected} onChange={(checked) => setSelectedIds(checked ? visibleIds : [])} tone="danger" /></th>
                <th>아파트명</th>
                <th>위치</th>
                <th>공급면적</th>
                <th>평수</th>
                <th>호갱노노 금액</th>
                <th>네이버 금액</th>
                <th>주차공간</th>
                <th>
                  <span className="tooltip-header">
                    해방향
                    <span className="help-tip" tabIndex="0" aria-label="해방향 설명">
                      <HelpCircle size={14} />
                      <span className="help-bubble">
                        {`동향: 아침 일찍 해가 깊게 들어 오전에 활동이 많은 분들에게 좋습니다.
서향: 오후 늦게까지 해가 길게 들어 겨울철에 따뜻하며, 맞벌이 가구에게 적합합니다.
남동향 / 남서향: 남향을 기준으로 동쪽이나 서쪽으로 약간 치우친 방향으로, 남향 다음으로 선호도가 높습니다.`}
                      </span>
                    </span>
                  </span>
                </th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td className="empty-table" colSpan="11"><strong>표시할 보금자리가 없습니다.</strong><span>행 추가로 후보를 입력하세요.</span></td></tr>}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${row.isNew ? 'new-row' : ''} ${draggedId && dragOverId === row.id && draggedId !== row.id ? 'drag-over-row' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverId(row.id);
                  }}
                  onDragLeave={() => setDragOverId((current) => current === row.id ? null : current)}
                  onDrop={() => reorder(row)}
                >
                  <td
                    className="drag-column"
                    draggable
                    onDragStart={() => {
                      setDraggedId(row.id);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                  ><GripVertical size={16} /></td>
                  <td className="check-column"><PrettyCheckbox checked={selectedIds.includes(row.id)} onChange={(checked) => setSelectedIds((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} tone="danger" /></td>
                  <td>{cell(row, 'apartmentName')}</td>
                  <td>{cell(row, 'location')}</td>
                  <td>{cell(row, 'supplyArea')}</td>
                  <td>{cell(row, 'pyeong')}</td>
                  <td>{cell(row, 'hogangnonoAmount', 'money')}</td>
                  <td>{cell(row, 'naverAmount', 'money')}</td>
                  <td>{cell(row, 'parkingStatus', 'parking')}</td>
                  <td>{cell(row, 'sunDirection')}</td>
                  <td>{row.isNew || (editingCell?.rowId === row.id && editingCell?.field === 'memo') ? <textarea value={row.memo ?? ''} onBlur={() => setEditingCell(null)} onChange={(event) => updateRow(row.id, 'memo', event.target.value)} /> : <span className="read-text memo-text multi-line" onDoubleClick={() => setEditingCell({ rowId: row.id, field: 'memo' })}>{row.memo || '-'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {isPasteModalOpen && <PasteModal title="보금자리 엑셀 붙여넣기" guide="아파트명  위치  공급면적  평수  호갱노노 금액  네이버 금액  주차공간  해방향  메모" example={'아파트A\t서울\t84㎡\t34평\t1000000000\t990000000\t여유\t남동향\t메모'} value={pasteText} message={pasteMessage} onChange={setPasteText} onClose={() => setIsPasteModalOpen(false)} onApply={applyPastedRows} />}
    </main>
  );
}

function SettingsPage({ settings, onSettingsChange }) {
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function updateDarkMode(enabled) {
    setMessage('');
    setNotice('');
    onSettingsChange({ ...settings, darkMode: enabled });
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/dark-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text ? JSON.parse(text).message ?? text : '설정을 저장하지 못했습니다.');
      onSettingsChange(text ? JSON.parse(text) : { darkMode: enabled });
      setNotice('설정을 저장했습니다.');
    } catch (error) {
      onSettingsChange({ ...settings, darkMode: !enabled });
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateDefaultPage(page) {
    const previousSettings = settings;
    const nextSettings = { ...settings, defaultPage: page };
    setMessage('');
    setNotice('');
    onSettingsChange(nextSettings);
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/default-page`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text ? JSON.parse(text).message ?? text : '설정을 저장하지 못했습니다.');
      onSettingsChange(normalizeSettings(text ? JSON.parse(text) : nextSettings));
      setNotice('설정을 저장했습니다.');
    } catch (error) {
      onSettingsChange(previousSettings);
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell wide-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Power 프로젝트</p>
          <h1>설정</h1>
          <p className="summary">사용자별 화면 옵션을 관리합니다.</p>
        </div>
      </section>
      {message && <p className="message">{message}</p>}
      {notice && <p className="saved-notice">{notice}</p>}
      <section className="settings-panel">
        <div className="settings-row">
          <div>
            <strong>다크모드</strong>
            <span>선택한 값은 DB에 저장되어 다음 입장 시에도 유지됩니다.</span>
          </div>
          <PrettyCheckbox checked={settings.darkMode} onChange={updateDarkMode} label={isSaving ? '저장 중' : '사용'} />
        </div>
        <div className="settings-row">
          <div>
            <strong>첫 화면 메뉴</strong>
            <span>로그인하거나 새로고침하면 선택한 메뉴로 이동합니다.</span>
          </div>
          <select value={settings.defaultPage} onChange={(event) => updateDefaultPage(event.target.value)} disabled={isSaving}>
            {START_PAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [activePage, setActivePage] = useState('checklist');
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  async function loadSettings() {
    const response = await fetch(`${API_BASE_URL}/api/settings`);
    if (!response.ok) {
      setSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const nextSettings = normalizeSettings(await response.json());
    setSettings(nextSettings);
    return nextSettings;
  }

  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`);
        if (!response.ok) {
          setUser(null);
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        setUser(await response.json());
        const nextSettings = await loadSettings();
        setActivePage(nextSettings.defaultPage);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkLogin();
  }, []);

  async function logout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
    setActivePage('checklist');
  }

  if (isCheckingAuth) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="login-brand">Power</div>
          <p>로그인 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <LoginPage onLogin={async (nextUser) => {
      setUser(nextUser);
      const nextSettings = await loadSettings();
      setActivePage(nextSettings.defaultPage);
    }} />;
  }

  return (
    <div className={`workspace-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${settings.darkMode ? 'dark-mode' : ''}`}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        user={user}
        onLogout={logout}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className="content-area">
        {activePage === 'checklist' && <ChecklistPage />}
        {activePage === 'personnel' && <PersonnelPage />}
        {activePage === 'budget' && <BudgetPage />}
        {activePage === 'weddingHall' && <WeddingHallPage />}
        {activePage === 'sdm' && <SdmPage />}
        {activePage === 'home' && <HomePage />}
        {activePage === 'settings' && <SettingsPage settings={settings} onSettingsChange={setSettings} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
