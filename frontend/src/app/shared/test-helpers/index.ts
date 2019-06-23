import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

export * from './async-observable-helpers';
export * from './activated-route-stub';
export * from './router-link-directive-stub';

// Short test utilities //

/**
 * Simulate a left mouse button element click.
 */
export function click(el: DebugElement | HTMLElement): void {
  if (el instanceof HTMLElement) {
    el.click();
  } else {
    el.triggerEventHandler('click', { button: 0 });
  }
}

/**
 * Simulate entering data in an <input> element.
 *
 * @param text: The text to enter in the <input>.
 * @param isAppend: Append the text if true. Replace input if false. Defaults to false.
 */
export function sendInput(
  fixture: ComponentFixture<any>,
  inputElement: HTMLInputElement,
  text: string,
  isAppend = false,
): Promise<any> {
  fixture.detectChanges();
  inputElement.value = isAppend ? inputElement.value + text : text;
  inputElement.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  return fixture.whenStable();
}

/**
 * Find by CSS utilities for .spec files.
 */
export function findId<T>(fixture: ComponentFixture<any>, id: string): T {
  const element = fixture.debugElement.query(By.css('#' + id));
  return element.nativeElement;
}

export function findTag<T>(fixture: ComponentFixture<any>, tag: string): T {
  const element = fixture.debugElement.query(By.css(tag));
  return element.nativeElement;
}

/**
 * Use to find a html element that may or may not be present.
 * @param fixture component fixture.
 * @param css A valid css selector.
 * @returns HTMLElement or null if element not found.
 */
export function findCssOrNot<T>(
  fixture: ComponentFixture<any>,
  css: string,
): T {
  const element = fixture.debugElement.query(By.css(css));
  return element ? element.nativeElement : null;
}

/**
 * Use to find all html element that may or may not be present.
 * @param fixture component fixture.
 * @param css A valid css selector.
 * @returns an array of HTMLElements or null if element not found.
 */
export function findAllCssOrNot(
  fixture: ComponentFixture<any>,
  css: string,
): DebugElement[] | null {
  const elements = fixture.debugElement.queryAll(By.css(css));
  return elements ? elements : null;
}

export function findAllTag(
  fixture: ComponentFixture<any>,
  tag: string,
): DebugElement[] {
  const DebugElements = fixture.debugElement.queryAll(By.css(tag));
  return DebugElements;
}

export function findElements(
  fixture: ComponentFixture<any>,
  el: string,
): DebugElement[] {
  const DebugElements = fixture.debugElement.queryAll(By.css(el));
  return DebugElements;
}
