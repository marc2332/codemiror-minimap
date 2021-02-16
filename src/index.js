import CodeMirror from 'codemirror'
import '../node_modules/codemirror/addon/merge/merge.js'
import '../node_modules/codemirror/addon/merge/merge.css'
import '../node_modules/codemirror/lib/codemirror.css'

const cm = CodeMirror(document.getElementById("cm"), {
	value: `\n TEST`.repeat(1000).split('TEST').map(n => n+Math.random()).join(''),
	lineNumbers: true,
	scrollbarStyle: null
})

function roundUp(num, precision = 1) {
  precision = Math.pow(10, precision)
  return Math.ceil(num * precision) / precision
}

function createMinimap(originalCM, nodeElement){
	const linkedDocument = originalCM.linkedDoc()
	
	const minimapCM = CodeMirror(nodeElement, {
		value: '2',
		readOnly: true,
		autofocus: false,
		dragDrop: false,
		spellcheck: false,
		autocorrect: false,
		scrollbarStyle: null
	})

	minimapCM.swapDoc(linkedDocument)

	let cm1IsClicked = false
	let cm2IsClicked = false
		
	originalCM.getWrapperElement().addEventListener('mouseover', () => {
		cm2IsClicked = false
		cm1IsClicked = true
	})

	minimapCM.getWrapperElement().addEventListener('mouseover', () => {
		cm2IsClicked = true
		cm1IsClicked = false
	})
	
	originalCM.getWrapperElement().addEventListener('mouseleave', () => {
		cm2IsClicked = false
		cm1IsClicked = true
	})
	
	minimapCM.getWrapperElement().addEventListener('mouseleave', () => {
		cm2IsClicked = false
		cm1IsClicked = true
	})
	
	minimapCM.on('mousedown', (cm,e) => {
		e.preventDefault()
		originalCM.focus()
	})
		
	originalCM.on('scroll', () => {
		if(!cm2IsClicked) syncInstances(minimapCM, originalCM)
	})

	
	const scrollbarWrapper =  document.createElement('DIV')
	const scrollbarElement =  document.createElement('DIV')
	
	scrollbarWrapper.appendChild(scrollbarElement)
	scrollbarWrapper.style = `max-height: 500px; overflow: hidden scroll;`
	scrollbarElement.style = `min-width: 1px;`
	scrollbarElement.style.height = originalCM.getScrollInfo().height

	originalCM.on('change', () => {
		setTimeout(() => {
			scrollbarElement.style.height = originalCM.getScrollInfo().height
		},1)
	})
	
	scrollbarWrapper.addEventListener('mouseover', () => {
		cm1IsClicked = false
	})
	
	scrollbarWrapper.addEventListener('scroll', () => {
		if(!cm1IsClicked && !isDragging){
			originalCM.scrollTo(0, scrollbarWrapper.scrollTop)
			syncInstances(minimapCM, originalCM, true)
		}
	})
		
	originalCM.getWrapperElement().parentElement.appendChild(scrollbarWrapper)
	
	const syncInstances = (toCM, fromCM, fromScrollbar = false, fromSlider = false) => {
		const toCMInfo = toCM.getScrollInfo()
		const fromCMInfo = fromCM.getScrollInfo()
		const per_current = fromCMInfo.top / (fromCMInfo.height - fromCMInfo.clientHeight) * 100
		const pos_current = (toCMInfo.height - toCMInfo.clientHeight) * per_current / 100
		toCM.scrollTo(fromCMInfo.left, pos_current)

		if(!fromScrollbar) {
			scrollbarWrapper.scrollTo(fromCMInfo.left, originalCM.getScrollInfo().top)
		}

		if(!fromSlider){
			const pos_current2 = (toCMInfo.clientHeight - minimapScrollerElement.clientHeight) * per_current / 100
			minimapScrollerElement.style.top = pos_current2
		}
		
	}
	
	const minimapScrollerElement = document.createElement('DIV')
	
	minimapScrollerElement.classList.add('minimapScroller')
	
	let isHovering = false
	let isDragging = false
	let isClicking = false
	let initialY = 0
	let initialClientY = 0
	let differenceMouse = 0
	
	minimapScrollerElement.addEventListener('mouseenter', () => {
		isHovering = true
	})
	
	minimapScrollerElement.addEventListener('mouseleave', () => {
		isHovering = false
	})
	
	window.addEventListener('mouseup', (e) => {
		isClicking = false
	})
	
	minimapScrollerElement.addEventListener('mousedown', (e) => {
		isClicking = true
		if(isHovering) {
			isDragging = true
			initialY = originalCM.getScrollInfo().top
			initialClientY = e.clientY
			differenceMouse = minimapScrollerElement.getBoundingClientRect().top - e.clientY
		}
	})
	
	
	window.addEventListener('mousemove', (e) => {
		if(isDragging){
			const differenceY = (scrollbarWrapper.getBoundingClientRect().top - e.clientY) -differenceMouse
			const pos = minimapScrollerElement.getBoundingClientRect().top - minimapScrollerElement.clientHeight
			const scrollingPercentage = roundUp((minimapScrollerElement.getBoundingClientRect().top - scrollbarWrapper.getBoundingClientRect().top ) / (scrollbarWrapper.clientHeight - minimapScrollerElement.clientHeight) * 100)
			const maxHeight = originalCM.getScrollInfo().height
			
			if(differenceY > 0){
				/*
				* Set all scrolling elements to the top
				*/
				originalCM.scrollTo(0, 0)
				minimapCM.scrollTo(0, 0)
				scrollbarWrapper.scrollTo(0, 0)
				minimapScrollerElement.style.top = 0
			}else if(Math.abs(differenceY) + minimapScrollerElement.clientHeight > scrollbarWrapper.clientHeight - 10){
				/*
				* Set all scrolling elements to the bottom
				*/
				originalCM.scrollTo(0, maxHeight)
				minimapScrollerElement.style.top = scrollbarWrapper.clientHeight-minimapScrollerElement.clientHeight
				minimapCM.scrollTo(0, maxHeight)
				scrollbarWrapper.scrollTo(0, maxHeight)
			}else if(differenceY < 0 && pos < scrollbarWrapper.clientHeight){
				/*
				* Scroll to the calculated position
				*/
				minimapScrollerElement.style.top = roundUp(Math.abs(differenceY))
				const scrolled = maxHeight * scrollingPercentage / 100
				originalCM.scrollTo(0, scrolled)
				syncInstances(minimapCM, originalCM, false, true)
			}
		}
		if(!isClicking) isDragging = false
	})
	
	minimapCM.getWrapperElement().appendChild(minimapScrollerElement)
	
	const lineHeightCm1 = originalCM.defaultTextHeight()
	const scrollInfoCm1 = originalCM.getScrollInfo()
	const visibleLinesCm1 = scrollInfoCm1.clientHeight / lineHeightCm1
	const lineHeightCm2 = minimapCM.defaultTextHeight()
	const visibleLinesHeightCm2 = lineHeightCm2 * visibleLinesCm1

	// Set scroller initial size
	minimapScrollerElement.style.height = visibleLinesHeightCm2
	
}

createMinimap(cm, document.getElementById('cm'))