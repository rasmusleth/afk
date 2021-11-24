// ---------------------------------- Futsal Movement ----------------------------------
if(document.getElementById("ligaholdet")){
	const container = document.querySelector(".hex-container");
	const inner = document.querySelector(".hex-wrapper");

	const onMouseEnterHandler = function(event){
		update(event);
	};
	const onMouseLeaveHandler = function(){
		inner.style = "";
	};
	var onMouseMoveHandler = function(event){
		if(isTimeToUpdate()){
			update(event);
		}
	};

	container.onmouseenter = onMouseEnterHandler;
	container.onmouseleave = onMouseLeaveHandler;
	container.onmousemove = onMouseMoveHandler;

	var counter = 0;
	var updateRate = 10;
	var isTimeToUpdate = function(){
		return counter++ % updateRate === 0;
	};

	// MOUSE
	var mouse ={
		_x: 0,
		_y: 0,
		x: 0,
		y: 0,
		updatePosition: function(event){
			var e = event || window.event;
			this.x = e.clientX - this._x;
			this.y = (e.clientY - this._y) * -1;
		},
		setOrigin: function(e){
			this._x = e.offsetLeft + Math.floor(e.offsetWidth/2);
			this._y = e.offsetTop + Math.floor(e.offsetHeight/2)
		},
		show: function(){ return "(" + this.x + ", " + this.y +")"; }
	};

	// Track the mouse position relative to the center of the container
	mouse.setOrigin(container);

	// THE UPDATE FUNCTION
	var update = function(event){
		mouse.updatePosition(event);
		updateTransformStyle(
			(mouse.y / inner.offsetHeight/2).toFixed(2),
			(mouse.x / inner.offsetWidth/2).toFixed(2)
		);
	};

	var updateTransformStyle = function(x, y){
		var style = "rotateX(" + x + "deg) rotateY(" + y + "deg)";
		// TEEST
		// var translateStyle = "translateX(" + x + "px) translateY(" + y +"px)";
		
		inner.style.transform = style;
		inner.style.webkitTransform = style;
		inner.style.mozTransform = style;
		inner.style.msTransform = style;
		inner.style.oTransform = style;
	};
}

 
// ---------------------------------- GENERAL ----------------------------------



// LOGO_HOVER_OVER_TRANSFORMATION

document.querySelector("#logo").addEventListener("mouseover", logoMouseOver);
document.querySelector("#logo").addEventListener("mouseout", logoMouseOut);

function logoMouseOver(){
	var logoTrans1 = document.querySelector(".logo img");
	var logoTrans2 = document.querySelector(".logoEffect");
	var logoTrans2_1 = document.querySelector(".logoEffect2");
	logoTrans1.style.transform = "rotate(360deg)";
	logoTrans1.style.transition = "transform 0.3s ease-in";
	logoTrans2.style.marginLeft = "-10px";
	logoTrans2_1.style.marginRight = "-10px";
	
	
}

function logoMouseOut(){
	var logoTrans1 = document.querySelector(".logo img");
	var logoTrans2 = document.querySelector(".logoEffect");
	var logoTrans2_1 = document.querySelector(".logoEffect2");
	logoTrans1.style.transform = "rotate(-360deg)";
	logoTrans1.style.transition = "transform 0.3s ease-out";
	logoTrans2.style.marginLeft = "-70px";
	logoTrans2_1.style.marginRight = "-70px";
	
}

// SEARCH-BAR OPEN/CLOSE

// document.querySelector(".search img").addEventListener("click", openSearch);

// function openSearch(){
// 	document.body.classList.toggle("show-search-bar");
// }


// // SEARCH-FUNCTION 

// document.querySelector(".search-bar").addEventListener("click", searchFunction);

// function searchFunction(){
// 	searchInput = document.querySelector(".search-bar").value;
// 	console.log(searchInput)
// }

// LOGIN_FORM_POP-UP

document.querySelector(".logIn").addEventListener("click", openLoginForm);
document.querySelector(".popup-close-login").addEventListener("click", closeLoginForm);

function openLoginForm(){
	document.body.classList.add("showLoginForm");
}

function closeLoginForm(){
	document.body.classList.remove("showLoginForm");
}

// SIGN-UP_FORM_POP-UP

document.querySelector(".signUp").addEventListener("click", openSignUpForm);
if(document.getElementById("academy")){
	document.querySelector(".signUpAcademy").addEventListener("click", openSignUpForm);
}
document.querySelector(".signUpFooter").addEventListener("click", openSignUpForm);
document.querySelector(".popup-close-signup").addEventListener("click", closeSignUpForm);
if(document.querySelector("#forside")){
	document.querySelector(".signUpHome").addEventListener("click", openSignUpForm)
}

function openSignUpForm(){
	document.body.classList.add("showSignUpForm");
}

function closeSignUpForm(){
	document.body.classList.remove("showSignUpForm");
}

// Billet-advarsel_POP-UP
if(document.querySelector(".billet-el-saeson")) {
	const koebBillet = Array.from(document.querySelectorAll(".billet-koeb"))
	const billetPopUpClose = document.querySelector(".popup-close")
	
	koebBillet.forEach(btn => {
		btn.addEventListener("click", (e) => {
			e.preventDefault()
			document.body.classList.add("showBilletAdvarsel")
		})
	})

	billetPopUpClose.addEventListener("click", (e) => {
		 e.preventDefault()
		 document.body.classList.remove("showBilletAdvarsel")
	})
}


// STILLING-nav OPEN/CLOSE
if(document.getElementById("stilling-page")){

	let navVest = document.querySelector(".stilling-nav-vest")
	let navOest = document.querySelector(".stilling-nav-oest")

	navVest.addEventListener("click", () => {
		document.body.classList.toggle("show-stilling-vest")
		document.body.classList.toggle("highlight-stilling-nav-vest")
		if (document.querySelector(".show-stilling-oest") != undefined){
			document.body.classList.toggle("show-stilling-oest")
			document.body.classList.toggle("highlight-stilling-nav-oest")
		}
	})
	navOest.addEventListener("click", () => {
		document.body.classList.toggle("show-stilling-oest")
		document.body.classList.toggle("highlight-stilling-nav-oest")
		if (document.querySelector(".show-stilling-vest") != undefined){
			document.body.classList.toggle("show-stilling-vest")
			document.body.classList.toggle("highlight-stilling-nav-vest")
		}
	})
}


// Image-presenter - change image
if(document.getElementById("images-page")){
	var primaryImg = document.querySelector(".primary-img")
	var imageScroller = document.querySelector(".small-images");
	var smallImages = Array.from(imageScroller.children);
	for (var i = 0; i < smallImages.length; i++) {
		var image = smallImages[i];
		image.addEventListener("click", function(event){
			var imageClicked = event.target;
			var getSrc = imageClicked.getAttribute("src");
			primaryImg.setAttribute("src", getSrc);
		})
	}

	// Container relative height-adjustment
	if(document.body.clientWidth > 900) {
		updateHeight()
	}
	window.addEventListener("resize", updateHeight)

	function updateHeight() {
		let clientWidth = document.body.clientWidth
		if (clientWidth > 900) {
			const presenterContainer = document.querySelector(".image-presenter")
			let containerWidth = getComputedStyle(presenterContainer).width
			let newHeight = parseFloat(containerWidth, 10) / 1.985

			presenterContainer.style.height = `${newHeight.toString()}px`
		} else return
	}
	
	if(document.body.clientWidth <= 530) {
		updateHeightMobile()
	}
	window.addEventListener("resize", updateHeightMobile)

	function updateHeightMobile() {
		let clientWidth = document.body.clientWidth
		if (clientWidth <= 530) {
			const presenterContainer = document.querySelector(".image-presenter")
			let containerWidth = getComputedStyle(presenterContainer).width
			let newHeight = parseFloat(containerWidth, 10) / 1.12

			presenterContainer.style.height = `${newHeight.toString()}px`
		} else return
	}
};


//KAMP-ARKIV: view/hide videos
if(document.getElementById("kamp-arkiv")){
	// NR 1
	var openerOne = document.querySelector(".opener-one");

	openerOne.addEventListener("click", openVidContainerOne);

	function openVidContainerOne(){
		document.body.classList.toggle("video-container-show-one");
	}
	// NR 2
	var openerTwo = document.querySelector(".opener-two");

	openerTwo.addEventListener("click", openVidContainerTwo);

	function openVidContainerTwo(){
		document.body.classList.toggle("video-container-show-two");
	}
}

//FORSIDE: Image-SLIDER
if(document.getElementById("forside")){
	// Buttons
	const arrowNext = document.querySelector(".right-arrow");
	const arrowLast = document.querySelector(".left-arrow");
	// let selectedSlide = document.querySelector(".selected")

	// Slider elements
	const slideContainer = document.querySelector(".slide-container")
	const slides = Array.from(document.querySelectorAll(".slides"))

	// Tracker element
	const trackers = Array.from(document.querySelectorAll(".dots"))

	// Counter
	let counter = 1
	let imageWidth = slides[0].clientWidth

	// Initial movement - from til "CLone" to the first slide
	slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"


	// AUtomatisk ImageWidth updater
	addEventListener("resize", () => {
		imageWidth = slides[0].clientWidth
		slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"
	})


	// Event-listeners
	arrowNext.addEventListener("click", () => {
		if(counter >= slides.length -1) return
		counter++
		slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"
		slideContainer.style.transition = "transform 400ms ease-out"
	})

	arrowLast.addEventListener("click", () => {
		if(counter <= 0) return
		counter--
		slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"
		slideContainer.style.transition = "transform 400ms ease-out"
	})

	slideContainer.addEventListener("transitionend", () => {
		if (slides[counter].id === "last-clone"){
			slideContainer.style.transition = "none"
			counter = slides.length - 2
			slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"
		} else if (slides[counter].id === "first-clone"){
			slideContainer.style.transition = "none"
			counter = slides.length - counter
			slideContainer.style.transform = "translateX(" + (-imageWidth * counter) + "px)"
		}
	})

}

// ----------- MOBILE FUNCTIONALITY --------------
const brugerIcon = document.querySelector(".burger-icon")
const burgerIconBars = Array.from(document.querySelectorAll(".burger-icon-bar"))
const brugerContent = document.querySelector(".afk-nav-burger-content")

// Burger - OPEN/CLOSE
brugerIcon.addEventListener("click", () => {
	document.body.classList.toggle("show-burger-nav")

	if(getComputedStyle(burgerIconBars[1]).display === "block") {
		brugerContent.style.transform = "translateY(0)"
		// Remove middle
		burgerIconBars[1].style.display = "none"
		// Rotate top
		burgerIconBars[0].style.transform = "rotate(135deg) translateY(-5px)"
		// Rotate bottom
		burgerIconBars[2].style.transform = "rotate(45deg) translateY(-5px)"
	} else {
		brugerContent.style.transform = "translateY(-125%)"
		burgerIconBars[1].style.display = "block"
		burgerIconBars[0].style.transform = "rotate(0deg)"
		burgerIconBars[2].style.transform = "rotate(0deg)"
	}

})
// Burger NESTED nav
const burgerNestedOpeners = Array.from(document.querySelectorAll(".burger-nested-opener"))
const nestedNavs = Array.from(document.querySelectorAll(".nav-burger-nested"))

burgerNestedOpeners.forEach((nestedBurger) => {
	nestedBurger.addEventListener("click", () => {
		if(nestedBurger.nextElementSibling.style.display === "none"){
			nestedBurger.nextElementSibling.style.display = "flex"
			nestedBurger.style.transform = "rotate(-180deg)"
		} else {
			nestedBurger.nextElementSibling.style.display = "none"
			nestedBurger.style.transform = "rotate(0)"
		}
	nestedNavs.forEach((nestedNav) => {
		const burgerChecker = nestedNav.previousElementSibling
		if (getComputedStyle(nestedNav).display === "flex" && burgerChecker !== nestedBurger){
			nestedNav.style.display = "none"
			burgerChecker.style.transform = "rotate(0)"
		} else if (nestedNav === nestedBurger) {
			nestedNav.style.display = "flex"	
		} 
	})

	})
})

