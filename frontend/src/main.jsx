import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, RefreshCw, Settings, X } from 'lucide-react';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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

function App() {
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
  ].filter(Boolean).join(', ');

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
      { id: `new-${Date.now()}`, categoryId: categories[0].id, relation: '', name: '', amount: 0, invitation: false, isNew: true },
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
    <div className="workspace-layout">
      <aside className="side-nav">
        <div className="brand-mark">Power</div>
        <nav>
          <button type="button">홈</button>
          <button className="active" type="button">인원관리</button>
          <button type="button">정산관리</button>
          <button type="button">설정</button>
        </nav>
      </aside>

      <main className="app-shell wide-shell">
        <section className="hero compact-hero">
          <div>
            <p className="eyebrow">Power 프로젝트</p>
            <h1>인원관리</h1>
            <p className="summary">대분류와 소분류 기준으로 대상자를 입력하고 적용 인원을 자동 계산합니다.</p>
          </div>
          <div className="hero-actions">
            <button className="health-button" type="button" onClick={openCategoryModal}>
              <Settings size={16} /> 분류 관리
            </button>
            <button className="icon-button" type="button" onClick={loadData} disabled={isLoading} aria-label="새로고침">
              <RefreshCw size={18} />
            </button>
          </div>
        </section>

        <section className="filter-strip">
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
                  <th>대상자 수</th>
                  <th>적용 수</th>
                  <th className="total-head">합계</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.length === 0 && newRows.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan="11">
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

                  return group.rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        <PrettyCheckbox
                          checked={selectedRowIds.includes(row.id)}
                          onChange={(checked) => toggleRowSelection(row.id, checked)}
                          tone="danger"
                        />
                      </td>
                      {index === 0 && (
                        <td className="merged major-cell" rowSpan={peopleCount}>
                          {isEditing(row.id, 'major') ? (
                            <select
                              autoFocus
                              value={group.category.major}
                              onBlur={() => setEditingCell(null)}
                              onChange={(event) => updatePersistedRowMajor(row, event.target.value)}
                            >
                              {majorOptions.map((major) => <option key={major} value={major}>{major}</option>)}
                            </select>
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(row.id, 'major')}>{group.category.major}</span>
                          )}
                        </td>
                      )}
                      {index === 0 && (
                        <td className="merged minor-cell" rowSpan={peopleCount}>
                          {isEditing(row.id, 'minor') ? (
                            <select
                              autoFocus
                              value={group.category.id}
                              onBlur={() => setEditingCell(null)}
                              onChange={(event) => updatePersistedRowCategory(row, event.target.value)}
                            >
                              {minorOptions.map((category) => (
                                <option key={category.id} value={category.id}>{category.minor}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="read-text" onDoubleClick={() => startEditing(row.id, 'minor')}>{group.category.minor}</span>
                          )}
                        </td>
                      )}
                      {index === 0 && (
                        <td className="merged readonly-metric" rowSpan={peopleCount}>{group.category.percent}%</td>
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
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
