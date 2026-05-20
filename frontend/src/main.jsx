import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleCheck, GripVertical, LogOut, PanelLeftClose, PanelLeftOpen, PieChart, Plus, ReceiptText, RefreshCw, Settings, Wallet, X } from 'lucide-react';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const BUDGET_SIMPLE_VIEW_KEY = 'power.budget.simpleView';

function currency(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
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
          <button type="button" title="설정">
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
        {savedNotice && <p className="saved-notice">{savedNotice}</p>}
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
  const [editingCell, setEditingCell] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!draggedId) return;
    reorderItems(items.map((item) => item.id === draggedId ? { ...item, categoryId } : item));
    setDraggedId(null);
  }

  function dropItemOnItem(targetItem) {
    if (!draggedId || draggedId === targetItem.id) return;
    const dragged = items.find((item) => item.id === draggedId);
    if (!dragged) return;
    const withoutDragged = items.filter((item) => item.id !== draggedId);
    const nextDragged = { ...dragged, categoryId: targetItem.categoryId };
    const targetIndex = withoutDragged.findIndex((item) => item.id === targetItem.id);
    const nextItems = [...withoutDragged];
    nextItems.splice(targetIndex < 0 ? nextItems.length : targetIndex, 0, nextDragged);
    reorderItems(nextItems);
    setDraggedId(null);
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
      {notice && <p className="saved-notice">{notice}</p>}

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
                      className="checklist-category-row"
                      onClick={() => addItem(category.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => dropItemOnCategory(category.id)}
                    >
                      <td colSpan="8" style={{ background: category.color }}>
                        <strong>{category.name}</strong>
                        <span>{categoryItems.length === 0 ? '분류 로우 클릭 시 체크리스트 추가' : `${categoryItems.length}개 항목`}</span>
                      </td>
                    </tr>
                    {categoryItems.map((item) => (
                      <tr
                        className="checklist-item-row"
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggedId(item.id)}
                        onDragOver={(event) => event.preventDefault()}
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
          <Wallet size={30} />
          <span>나의 예산</span>
          <strong>{currency(assetTotals.available)} / {currency(assetTotals.total)}</strong>
          <em>가용금액 / 전체금액</em>
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
      {notice && <p className="saved-notice">{notice}</p>}

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
            {assetNotice && <p className="category-notice">{assetNotice}</p>}

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
    </main>
  );
}

function App() {
  const [activePage, setActivePage] = useState('checklist');
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`);
        if (!response.ok) {
          setUser(null);
          return;
        }
        setUser(await response.json());
        setActivePage('checklist');
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkLogin();
  }, []);

  async function logout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
    setUser(null);
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
    return <LoginPage onLogin={(nextUser) => {
      setUser(nextUser);
      setActivePage('checklist');
    }} />;
  }

  return (
    <div className={`workspace-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
