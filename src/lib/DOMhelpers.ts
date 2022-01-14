const doc = eval('document') as Document

/**
 * @param logName Pattern to match in the titlebar of the log
 * @returns HTML Element matching that title, null if it can't be found
 */
export function getLogElement(logName: string): Element | null {
    const titleBar = doc.querySelector(`[title*="${logName}"]`)
    if (titleBar == null) return null

    return traverseDOM(titleBar, 'parent', 'parent', 'parent') as Element | null
}

/**
 * log.lastChild.firstChild.firstChild.children
 * @param logName Pattern to match in the titlebar of the log
 * @returns HTMLCollection of paragraph elements matching that title, null if it can't be found
 */
export function getLogParagraphs(logName: string): HTMLCollectionOf<HTMLParagraphElement> | null {
    return traverseDOM(getLogElement(logName),
        'lastChild',
        'firstChild',
        'firstChild',
        'children') as HTMLCollectionOf<HTMLParagraphElement> | null
}

/**
 * log.lastChild.firstChild
 * @param logName Pattern to match in the titlebar of the log
 * @returns Resizable HTMLDivElement matching that title, null if it can't be found
 */
export function getLogResizable(logName: string): HTMLDivElement | null {
    return traverseDOM(getLogElement(logName), 'lastChild', 'firstChild') as HTMLDivElement | null
}

/**
 * Nullsafe DOM traversal
 * @param element Starting element
 * @param path DOM traversal path, valid options are 'parent' 'firstChild' 'lastChild' and 'children',
 * no entries can exist after 'children'
 * @returns Element or collection at the point traversed to, null otherwise
 */
export function traverseDOM(element: Element | null, ...path: string[]): Element | HTMLCollection | null {
    if(element == null) return null

    const functions = {
        parent: (element : Element | null): Element | null => {
            if(element == null) return element
            return element.parentElement
        },

        firstChild: (element: Element | null): Element | null => {
            if(element == null) return element
            return element.firstElementChild
        },

        lastChild: (element: Element | null): Element | null => {
            if(element == null) return element
            return element.lastElementChild
        },

        children: (element: Element | null): HTMLCollection | null => {
            if(element == null) return element
            return element.children
        }
    }

    let ret : Element | HTMLCollection | null = element

    while(path.length > 0){
        // Null if tried to get next step of children
        if(Array.isArray(ret)) return null

        const next = path.shift() as string
        if(Object.keys(functions).includes(next)) {
            ret = functions[next as keyof typeof functions](ret as Element)
            if(ret == null) return ret
        } else {
            return null
        }
    }

    return ret
}

/**
 * Modifies one css property of the specified log
 * @param logName name that appears in the tilebar of the log
 * @param style property name of the style to change (hyphen-case)
 * @param value value to change the property to
 * @returns true if the log was found, false otherwise
 */
export function modifyLogStyle(logName: string, style: string, value: string): boolean {
    const paragraphs = getLogParagraphs(logName)
    if(paragraphs == null) return false

    for (const _p of paragraphs) {
        const p = _p
        if (p.style.getPropertyValue(style) != value) {
            p.style.setProperty(style, value)
        }
    }
    return true
}

/**
 * Resizes log to a specific size
 * @param logName name that appears in the titlebar of the log
 * @param width width as valid css string
 * @param height height as valid css string
 * @returns true if the log was found, false otherwise
 */
export function resizeLog(logName: string, width: string, height: string): boolean {
    const resizeable = getLogResizable(logName)
    if (resizeable == null) return false

    resizeable.style.width = width
    resizeable.style.height = height
    return true
}

/**
 * Sets the log to the minimum width that can support the last line
 * @param logName name that appears in the titlebar of the log
 * @returns width in pixels of the paragraph element, -1 if the log cannot be found
 */
export function minimizeLogWidth(logName: string): boolean {
    const log = getLogParagraphs(logName)
    if (log == null) return false

    const p = log[log.length - 1]
    if (p == null) return false

    p.style.setProperty('display', 'inline', 'important')
    return resizeLog(logName, `${p.offsetWidth + 1}px`, '20%')
}

/**
 * Creates a new node on the stat display directly below charisma
 *
 * New nodes are appended to the top of the custom stats section
 * @param name Name of the hook, will be displayed on the left side
 * @param border Whether a white border exists at the bottom of the display
 * @returns The new HTML node of the element
 */
export function createStatDisplay(name: string, color = '', border = true): Node {
    const extraHook = doc.getElementById('overview-extra-hook-0')
    if (extraHook == null) throw 'ERROR: Could not find extra hook, was it modified?'

    const extraHookRow = traverseDOM(extraHook, 'parent', 'parent') as Element
    const clonedRow = extraHookRow.cloneNode(true) as Element

    const children = traverseDOM(clonedRow, 'children') as HTMLCollection
    const hook0 = traverseDOM(children[0], 'firstChild') as HTMLElement
    const hook1 = traverseDOM(children[1], 'firstChild') as HTMLElement
    const hook2 = traverseDOM(children[2], 'firstChild') as HTMLElement

    hook0.id = name + '-hook-0'
    hook0.innerHTML = name
    hook1.id = name + '-hook-1'
    hook2.id = name + '-hook-2'

    if (!border) {
        hook0.style.setProperty('border-bottom', '0px')
        hook1.style.setProperty('border-bottom', '0px')
    }

    if (color.length != 0) {
        hook0.style.setProperty('color', color)
        hook1.style.setProperty('color', color)
        hook2.style.setProperty('color', color)
    }

    const parent = traverseDOM(extraHookRow, 'parent') as HTMLElement
    return parent.insertBefore(clonedRow, extraHookRow.nextSibling)
}

/**
 * Places a new value in the specified custom stat display
 * @param name Name of the display to modify
 * @param value value to set the stat display to
 * @returns true if the display was found, false otherwise
 */
export function updateStatDisplay(name: string, value: string): boolean {
    const statDisplay = doc.getElementById(name + '-hook-1')
    if (statDisplay == null || statDisplay == undefined) return false

    statDisplay.innerHTML = value
    return true
}

/**
 * Injects a single command into the terminal
 *
 * Must be on the terminal page for this to function
 * @param command text to be injected into the terminal
 */
export function runTerminalCommand(command: string): void {
    const terminalInput = doc.getElementById('terminal-input') as HTMLInputElement
    if (terminalInput == null) return
    terminalInput.value = command
    const handler = Object.keys(terminalInput)[1]
    const reactHandler = terminalInput[handler as keyof HTMLElement]
    //@ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    reactHandler.onChange({
        target: terminalInput
    })
    //@ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    reactHandler.onKeyDown({
        keyCode: 13,
        preventDefault: () => null
    })
}