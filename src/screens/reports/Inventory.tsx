// Stock reports: summary, item detail, locations, movement, ageing, reorder, orders and unbilled goods.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VOUCHER_META } from '../../core/defaults';
import { daysBetween, godownQuantities, itemOf, itemPositions, ledgerName, orderStatus, stockMoves, unbilledNotes, voucherAmount } from '../../core/engine';
import { fmt, fmtBlank, fmtDate, fmtQty } from '../../core/format';
import { useBooks } from '../../store/BooksContext';
import { Card, Combo, Empty, Notice, Tabs } from '../../ui/kit';
import { newVoucher } from '../../ui/nav';
import { Report } from '../../ui/report';

const useUnit = () => {
  const { data } = useBooks();
  return (unitId: string) => data.units.find(u => u.id === unitId)?.symbol ?? '';
};

export const StockSummaryPage: React.FC = () => {
  const { data, company } = useBooks();
  const unit = useUnit();
  const rows = useMemo(() => itemPositions(data, company.periodFrom, company.periodTo), [data, company.periodFrom, company.periodTo]);
  const groups = useMemo(() => {
    const out = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = r.item.groupId ?? '';
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(r);
    }
    return [...out.entries()].map(([id, list]) => ({ id, name: data.stockGroups.find(g => g.id === id)?.name ?? 'Primary', list }));
  }, [rows, data.stockGroups]);
  const total = (list: typeof rows) => list.reduce((s, r) => ({ open: s.open + r.openValue, in: s.in + r.inValue, out: s.out + r.outValue, close: s.close + r.closeValue }), { open: 0, in: 0, out: 0, close: 0 });
  const grand = total(rows);
  return (
    <Report title="Stock Summary" hint={`What you have and what it is worth. Valued at ${{ AVG: 'average cost', FIFO: 'first in, first out', LAST_PURCHASE: 'last purchase price' }[company.valuation]}.`}>
      <Card flush>
        {rows.length === 0 ? <Empty title="No stock items yet" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr><th>Item</th><th className="num">Opening qty</th><th className="num">Opening value</th><th className="num">In qty</th><th className="num">In value</th><th className="num">Out qty</th><th className="num">Out value</th><th className="num">Closing qty</th><th className="num">Rate</th><th className="num">Closing value</th></tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const t = total(g.list);
                  return (
                    <React.Fragment key={g.id}>
                      <tr className="sub"><td>{g.name}</td><td /><td className="num">{fmtBlank(t.open)}</td><td /><td className="num">{fmtBlank(t.in)}</td><td /><td className="num">{fmtBlank(t.out)}</td><td /><td /><td className="num">{fmt(t.close)}</td></tr>
                      {g.list.map(r => (
                        <tr key={r.item.id} data-href={`/inventory/item/${r.item.id}`}>
                          <td className="pl-6">{r.item.name}</td>
                          <td className="num">{r.openQty ? `${fmtQty(r.openQty)} ${unit(r.item.unitId)}` : ''}</td>
                          <td className="num">{fmtBlank(r.openValue)}</td>
                          <td className="num">{r.inQty ? fmtQty(r.inQty) : ''}</td>
                          <td className="num">{fmtBlank(r.inValue)}</td>
                          <td className="num">{r.outQty ? fmtQty(r.outQty) : ''}</td>
                          <td className="num">{fmtBlank(r.outValue)}</td>
                          <td className={`num font-medium ${r.closeQty < 0 ? 'text-rose-700' : ''}`}>{fmtQty(r.closeQty)} {unit(r.item.unitId)}</td>
                          <td className="num">{fmtBlank(r.closeRate)}</td>
                          <td className="num font-semibold">{fmt(r.closeValue)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot><tr><td>Total</td><td /><td className="num">{fmt(grand.open)}</td><td /><td className="num">{fmt(grand.in)}</td><td /><td className="num">{fmt(grand.out)}</td><td /><td /><td className="num">{fmt(grand.close)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const StockItemPage: React.FC = () => {
  const { id } = useParams();
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const unit = useUnit();
  const item = id ? itemOf(data, id) : undefined;
  const position = useMemo(() => itemPositions(data, company.periodFrom, company.periodTo).find(p => p.item.id === id), [data, id, company.periodFrom, company.periodTo]);
  const moves = useMemo(() => stockMoves(data).filter(m => m.itemId === id && m.date >= company.periodFrom && m.date <= company.periodTo), [data, id, company.periodFrom, company.periodTo]);
  const options = useMemo(() => data.stockItems.map(i => ({ id: i.id, label: i.name })), [data.stockItems]);
  if (!item || !position) return <Report title="Stock Item" period="none"><p className="hint">That item no longer exists.</p></Report>;
  const u = unit(item.unitId);
  let running = position.openQty;
  return (
    <Report
      title={item.name} hint={`In stock: ${fmtQty(position.closeQty)} ${u}, worth ${fmt(position.closeValue)}.`}
      actions={<div className="w-64 no-print"><Combo value={item.id} onChange={x => navigate(`/inventory/item/${x}`)} options={options} ariaLabel="Item" /></div>}
    >
      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Entry</th><th>Who</th><th>Location</th><th className="num">In</th><th className="num">Out</th><th className="num">Rate</th><th className="num">Balance</th></tr></thead>
            <tbody>
              <tr className="sub"><td /><td>Opening</td><td /><td /><td /><td /><td /><td className="num">{fmtQty(position.openQty)} {u}</td></tr>
              {moves.map((m, i) => {
                running += m.qty;
                return (
                  <tr key={`${m.voucher?.id}-${i}`} data-href={m.voucher ? `/voucher/${m.voucher.id}` : undefined}>
                    <td className="whitespace-nowrap">{fmtDate(m.date)}</td>
                    <td>{m.voucher ? `${VOUCHER_META[m.voucher.type].label} ${m.voucher.number}` : ''}</td>
                    <td>{m.voucher?.partyId ? ledgerName(data, m.voucher.partyId) : ''}</td>
                    <td>{data.godowns.find(g => g.id === m.godownId)?.name}</td>
                    <td className="num">{m.qty > 0 ? fmtQty(m.qty) : ''}</td>
                    <td className="num">{m.qty < 0 ? fmtQty(-m.qty) : ''}</td>
                    <td className="num">{fmtBlank(m.rate)}</td>
                    <td className="num font-medium">{fmtQty(running)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Report>
  );
};

export const GodownSummaryPage: React.FC = () => {
  const { data, company } = useBooks();
  const unit = useUnit();
  const qty = useMemo(() => godownQuantities(data, company.periodTo), [data, company.periodTo]);
  return (
    <Report title="Stock by Location" period="asOf" hint="How much of each item is at each place. Tally calls this the Godown Summary.">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {data.godowns.map(g => {
          const items = [...(qty.get(g.id)?.entries() ?? [])].filter(([, q]) => q !== 0);
          return (
            <Card key={g.id} title={g.name} flush>
              {items.length === 0 ? <p className="hint px-4 pb-4">Nothing here.</p> : (
                <table className="tbl">
                  <tbody>
                    {items.map(([itemId, q]) => {
                      const it = itemOf(data, itemId);
                      return <tr key={itemId} data-href={`/inventory/item/${itemId}`}><td>{it?.name}</td><td className={`num font-medium ${q < 0 ? 'text-rose-700' : ''}`}>{fmtQty(q)} {it ? unit(it.unitId) : ''}</td></tr>;
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          );
        })}
      </div>
    </Report>
  );
};

export const MovementPage: React.FC = () => {
  const { data, company } = useBooks();
  const [id, setId] = useState(data.stockItems[0]?.id ?? '');
  const options = useMemo(() => data.stockItems.map(i => ({ id: i.id, label: i.name })), [data.stockItems]);
  const rows = useMemo(() => {
    const byParty = new Map<string, { partyId: string; inQty: number; inValue: number; outQty: number; outValue: number }>();
    for (const m of stockMoves(data)) {
      if (m.itemId !== id || m.date < company.periodFrom || m.date > company.periodTo) continue;
      const partyId = m.voucher?.partyId ?? '';
      if (!byParty.has(partyId)) byParty.set(partyId, { partyId, inQty: 0, inValue: 0, outQty: 0, outValue: 0 });
      const r = byParty.get(partyId)!;
      if (m.qty > 0) { r.inQty += m.qty; r.inValue += m.value; } else { r.outQty += -m.qty; r.outValue += m.value; }
    }
    return [...byParty.values()];
  }, [data, id, company.periodFrom, company.periodTo]);
  return (
    <Report title="Movement Analysis" hint="Who you bought an item from, and who you sold it to." actions={<div className="w-64 no-print"><Combo value={id} onChange={setId} options={options} ariaLabel="Item" /></div>}>
      <Card flush>
        {rows.length === 0 ? <Empty title="No movement in this period" /> : (
          <table className="tbl">
            <thead><tr><th>Party</th><th className="num">Qty in</th><th className="num">Value in</th><th className="num">Qty out</th><th className="num">Value out</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.partyId}><td>{r.partyId ? ledgerName(data, r.partyId) : 'Internal (stock journal or count)'}</td><td className="num">{r.inQty ? fmtQty(r.inQty) : ''}</td><td className="num">{fmtBlank(r.inValue)}</td><td className="num">{r.outQty ? fmtQty(r.outQty) : ''}</td><td className="num">{fmtBlank(r.outValue)}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const StockAgeingPage: React.FC = () => {
  const { data, company } = useBooks();
  const today = company.currentDate;
  const rows = useMemo(() => data.stockItems.map(item => {
    const moves = stockMoves(data).filter(m => m.itemId === item.id && m.date <= today);
    const onHand = item.openingQty + moves.reduce((s, m) => s + m.qty, 0);
    // What is left is taken as the newest arrivals, as older goods go out first.
    const layers = [{ date: company.booksFrom, qty: item.openingQty }, ...moves.filter(m => m.qty > 0).map(m => ({ date: m.date, qty: m.qty }))];
    const buckets = { d30: 0, d60: 0, d90: 0, older: 0 };
    let left = Math.max(0, onHand);
    for (let i = layers.length - 1; i >= 0 && left > 0; i--) {
      const take = Math.min(left, layers[i].qty);
      const age = daysBetween(layers[i].date, today);
      if (age <= 30) buckets.d30 += take;
      else if (age <= 60) buckets.d60 += take;
      else if (age <= 90) buckets.d90 += take;
      else buckets.older += take;
      left -= take;
    }
    return { item, onHand, ...buckets };
  }).filter(r => r.onHand !== 0), [data, today, company.booksFrom]);
  return (
    <Report title="Stock Ageing" period="none" hint="How long your stock has been sitting, as of today.">
      <Card flush>
        {rows.length === 0 ? <Empty title="No stock on hand" /> : (
          <table className="tbl">
            <thead><tr><th>Item</th><th className="num">On hand</th><th className="num">Up to 30 days</th><th className="num">31 to 60</th><th className="num">61 to 90</th><th className="num">Over 90</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.item.id} data-href={`/inventory/item/${r.item.id}`}><td className="font-medium">{r.item.name}</td><td className="num">{fmtQty(r.onHand)}</td><td className="num">{r.d30 ? fmtQty(r.d30) : ''}</td><td className="num">{r.d60 ? fmtQty(r.d60) : ''}</td><td className="num">{r.d90 ? fmtQty(r.d90) : ''}</td><td className="num">{r.older ? fmtQty(r.older) : ''}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const ReorderPage: React.FC = () => {
  const { data, company } = useBooks();
  const navigate = useNavigate();
  const unit = useUnit();
  const rows = useMemo(() => {
    const onOrder = new Map<string, number>();
    for (const s of orderStatus(data, 'PURCHASE_ORDER')) onOrder.set(s.itemId, (onOrder.get(s.itemId) ?? 0) + s.pending);
    return itemPositions(data, company.periodFrom, company.periodTo)
      .filter(p => p.item.reorderLevel !== undefined && p.item.reorderLevel > 0)
      .map(p => ({ ...p, onOrder: onOrder.get(p.item.id) ?? 0, short: p.item.reorderLevel! - p.closeQty - (onOrder.get(p.item.id) ?? 0) }));
  }, [data, company.periodFrom, company.periodTo]);
  return (
    <Report title="Reorder Status" period="none" hint="Items at or below the level you set for buying more.">
      <Card flush>
        {rows.length === 0 ? <Empty title="No reorder levels set" hint="Set one on a stock item." /> : (
          <table className="tbl">
            <thead><tr><th>Item</th><th className="num">In stock</th><th className="num">Reorder at</th><th className="num">Already ordered</th><th className="num">Buy now</th><th className="no-print" /></tr></thead>
            <tbody>
              {rows.map(r => {
                const buy = r.short >= 0 ? Math.max(r.short, r.item.minOrderQty ?? 0) : 0;
                return (
                  <tr key={r.item.id}>
                    <td className="font-medium">{r.item.name}</td><td className="num">{fmtQty(r.closeQty)} {unit(r.item.unitId)}</td><td className="num">{fmtQty(r.item.reorderLevel!)}</td><td className="num">{r.onOrder ? fmtQty(r.onOrder) : ''}</td>
                    <td className={`num font-semibold ${buy > 0 ? 'text-rose-700' : ''}`}>{buy > 0 ? fmtQty(buy) : ''}</td>
                    <td className="text-right no-print">{buy > 0 && <button className="btn btn-sm" onClick={() => navigate(newVoucher('PURCHASE_ORDER'))}>Order</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </Report>
  );
};

export const OrdersPage: React.FC = () => {
  const { data } = useBooks();
  const navigate = useNavigate();
  const [side, setSide] = useState<'SALES_ORDER' | 'PURCHASE_ORDER'>('SALES_ORDER');
  const rows = useMemo(() => orderStatus(data, side).filter(s => s.pending > 0), [data, side]);
  const isSale = side === 'SALES_ORDER';
  return (
    <Report title="Order Outstandings" period="none" hint="Orders still waiting to be delivered.">
      <Tabs value={side} onChange={setSide} tabs={[{ id: 'SALES_ORDER', label: 'Client orders' }, { id: 'PURCHASE_ORDER', label: 'Vendor orders' }]} />
      <Card flush>
        {rows.length === 0 ? <Empty title="Nothing outstanding" action={<button className="btn btn-primary" onClick={() => navigate(newVoucher(side))}>New order</button>} /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Date</th><th>Due</th><th>{isSale ? 'Client' : 'Vendor'}</th><th>Item</th><th className="num">Ordered</th><th className="num">Delivered</th><th className="num">Pending</th><th className="no-print" /></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={`${r.order.id}-${r.itemId}`}>
                    <td className="font-medium">{r.order.number}</td><td className="whitespace-nowrap">{fmtDate(r.order.date)}</td><td className="whitespace-nowrap">{fmtDate(r.order.dueDate)}</td>
                    <td>{r.order.partyId ? ledgerName(data, r.order.partyId) : ''}</td><td>{itemOf(data, r.itemId)?.name}</td>
                    <td className="num">{fmtQty(r.ordered)}</td><td className="num">{r.delivered ? fmtQty(r.delivered) : ''}</td><td className="num font-semibold">{fmtQty(r.pending)}</td>
                    <td className="text-right no-print"><button className="btn btn-sm" onClick={() => navigate(`${newVoucher(isSale ? 'DELIVERY_NOTE' : 'RECEIPT_NOTE')}?fromOrder=${r.order.id}`)}>{isSale ? 'Deliver' : 'Receive'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Report>
  );
};

export const NotesPage: React.FC = () => {
  const { data } = useBooks();
  const navigate = useNavigate();
  const [side, setSide] = useState<'DELIVERY_NOTE' | 'RECEIPT_NOTE'>('DELIVERY_NOTE');
  const rows = useMemo(() => unbilledNotes(data, side), [data, side]);
  const isSale = side === 'DELIVERY_NOTE';
  return (
    <Report title="Goods Not Billed" period="none" hint="Goods sent or received with no invoice or bill recorded yet.">
      <Tabs value={side} onChange={setSide} tabs={[{ id: 'DELIVERY_NOTE', label: 'Sent to clients' }, { id: 'RECEIPT_NOTE', label: 'Received from vendors' }]} />
      <Card flush>
        {rows.length === 0 ? <Empty title="Everything is billed" /> : (
          <table className="tbl">
            <thead><tr><th>Note</th><th>Date</th><th>{isSale ? 'Client' : 'Vendor'}</th><th className="num">Value</th><th className="no-print" /></tr></thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} data-href={`/voucher/${v.id}`}>
                  <td className="font-medium">{v.number}</td><td>{fmtDate(v.date)}</td><td>{v.partyId ? ledgerName(data, v.partyId) : ''}</td><td className="num">{fmt(voucherAmount(v))}</td>
                  <td className="text-right no-print"><button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate(`${newVoucher(isSale ? 'SALES' : 'PURCHASE')}?fromNote=${v.id}`); }}>{isSale ? 'Create invoice' : 'Record bill'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Notice className="mt-3 no-print">An invoice made from a note does not move the goods a second time.</Notice>
    </Report>
  );
};
