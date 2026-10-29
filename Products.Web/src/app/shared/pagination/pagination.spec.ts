import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Pagination] }));
  function create(page = 1, totalCount = 95) {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('totalCount', totalCount);
    fixture.componentRef.setInput('totalPages', Math.ceil(totalCount / 10));
    fixture.detectChanges();
    return fixture;
  }
  it('disables previous navigation on the first page', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[aria-label="Previous page"]').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('1–10');
  });
  it('shows only the available items on the last page', () => {
    const fixture = create(10);
    expect(fixture.nativeElement.textContent).toContain('91–95');
    expect(fixture.nativeElement.querySelector('[aria-label="Next page"]').disabled).toBe(true);
  });
  it('emits the selected page', () => {
    const fixture = create(3);
    const listener = vi.fn();
    fixture.componentInstance.pageChange.subscribe(listener);
    fixture.nativeElement.querySelector('[aria-label="Next page"]').click();
    expect(listener).toHaveBeenCalledWith(4);
  });
  it('emits page-size changes', () => {
    const fixture = create();
    const listener = vi.fn();
    fixture.componentInstance.pageSizeChange.subscribe(listener);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledWith(25);
  });
  it('shows an empty range when no products match', () => {
    const fixture = create(1, 0);
    expect(fixture.nativeElement.textContent).toContain('0–0');
    expect(fixture.nativeElement.querySelector('[aria-label="Next page"]').disabled).toBe(true);
  });
});
