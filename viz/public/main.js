const DEBUG = false;
// forza italia, pd, +europa, fratelli d'italia, liberi e uguali, m5s, casapound, lega, potere al popolo
const PARTYCOLORS  = ["#0077FF", "#DE3030",  "#DE0090", "#00366b", "#d65125", "#FCDA1B", "#202020", "#00B700", "#900000"];

let container = d3.select("#container");
let width = container.node().getBoundingClientRect().width;
let height = container.node().getBoundingClientRect().height;


let svg = container.select("svg").attr("height", height);
let nodesCont = d3.select("#nodecontainer");
let edgesCont;





// SCALES
let radiusScale = d3.scaleSqrt().clamp(true).range([50,80]);
let strokeScale = d3.scaleLinear().clamp(true).range([1,7]);
let distanceScale = d3.scaleLinear().range([width*.25,1]); // lighter weight correspond to higher distances
let colorScale = d3.scaleOrdinal().range(PARTYCOLORS);

// STATE
const IDLE = "IDLE";
const NODE_MODE = "NODE_MODE";
const LINK_MODE = "LINK_MODE";
let state = IDLE;
let selectedSource;
let selectedTarget;
let selectedEdge;

// DATA
let graph;
let nodes; 

// PHYSICS
let simulation;



// START
d3.json("politicians_graph.json", init);



function init(error, data) {
	
	if (error) throw error;

	graph = data;

	// find parties and assign colors
	let parties = {};
	data.nodes.forEach(d=>{if(!parties[d.party]) parties[d.party]= d;});
	parties = Object.keys(parties);
	colorScale.domain(parties);

	// gradients
	let gradients = [];
	parties.forEach((d)=>{
		parties.forEach((dd)=>{
			if(dd!=d) {
				gradients.push({ source:d, target:dd});
			}
		});
		gradients.push({ source:d, target:d});
	});

	let gradient = svg
	.append("defs")
	.selectAll("linearGradient")
	.data(gradients)
	.enter()
	.append("linearGradient")
	.attr("id", d=>getGradientName(d.source, d.target));

	gradient.append("stop")
	.attr("stop-color", d=>colorScale(d.source))
	.attr("offset", "0%");

	gradient.append("stop")
	.attr("stop-color", d=>colorScale(d.target))
	.attr("offset", "100%");


	// assign id based on indices
	graph.nodes.forEach((d,i)=> d.id=i);

	// update scales
	let sortedWeights = graph.edges.map((d)=>d.weight).sort();
	let quantileExtent = [d3.quantile(sortedWeights, 0.05), d3.quantile(sortedWeights, 0.95)];

	distanceScale.domain(quantileExtent);
	strokeScale.domain(quantileExtent);
	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));



	initGraph();
}


function initGraph() {

	edgesCont = svg.append("g").attr("id", "edgesCont");


	let edges = graph.edges;

	let edge = edgesCont.selectAll(".edge")
	.data(edges, (d)=>d.id); 

	let edgeGroups = edge
	.enter()
	.append("g")
	.attr("class", "edge")
	.style("pointer-events", "none");
	
	edgeGroups
	.append("line");

	svg.on("mousedown touchend", ()=>{

		if(state == LINK_MODE || state == NODE_MODE) {
			selectedSource = null;
			selectedTarget = null;
			selectedEdge = null;
			state = IDLE;
			update();
		}
	}, true);



	nodes = nodesCont.selectAll(".node")
	.data(graph.nodes, (d)=>d.name)
	.enter()
	.append("div")
	.attr("class", "node")
	.style("pointer-events", "none");
	
	nodes
	.append("div")
	.attr("class", "nodebg")
	.style("transform", "translate(-50%,-50%")
	.style("border-radius", (d)=> (radiusScale(d.tweets)/2)+"px")
	.style("width", (d)=> radiusScale(d.tweets)+"px")
	.style("height", (d)=> radiusScale(d.tweets)+"px");

	nodes
	.append("div")
	.attr("class", "nodeimage")
	.style("transform", "translate(-50%,-50%")
	.style("border", (d)=> `3px solid ${colorScale(d.party)}`)
	.style("background-image", getImage)
	.style("border-radius", (d)=> (radiusScale(d.tweets)/2)+"px")
	.style("width", (d)=> radiusScale(d.tweets)+"px")
	.style("height", (d)=> radiusScale(d.tweets)+"px")
	.style("pointer-events", "auto")
	.on("mousedown", onNodeDown)
	// .call(d3.drag()
	// 	.on("start", dragstarted)
	// 	.on("drag", dragged)
	// 	.on("end", dragended));


	simulation = d3.forceSimulation()
	.force("edge", d3.forceLink())
	.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets)))
	.force("center", d3.forceCenter(width * .7, height * .5))
	.on("tick", ticked);

	simulation.nodes(graph.nodes);


	simulation.force("edge")
	.links(graph.edges)
	.distance((d)=> {
		return distanceScale(d.weight);
	});

	update();

}


function ticked() {
	edgesCont.selectAll(".edge")
	.attr("transform", d=>`translate(${d.source.x} ${d.source.y})`)
	.select("line")
	.each(function(d) {
		let dx = d.target.x - d.source.x;
		let dy = d.target.y - d.source.y;
		let w = Math.sqrt(dx*dx + dy*dy);
		let a = Math.atan2(dy, dx) * 180 / Math.PI;
		
		d3.select(this)
		.attr("y2",.1) // hack because gradient bbox area needs to be > 0
		.attr("x2", w)
		.attr("transform",`rotate(${a})`);

	});

	nodes
	.style("transform", d=>`translate(${d.x}px, ${d.y}px)`);

}




function findEdgeBetweenNodes(nodeA, nodeB) {

	let edge;
	graph.edges.forEach(d=>{
		if((d.source.id == nodeA.id || d.target.id == nodeA.id) && (d.source.id == nodeB.id || d.target.id == nodeB.id)) {
			edge = d;
		}
	});

	return edge;
}

function fadeOut(el) {
	el
	.transition()
	.style("opacity", 0)
	.on("end",()=>{
		el.style("visibility", "hidden")
	});
}

function fadeIn(el) {
	el
	.style("visibility", "visible")
	.transition()
	.style("opacity", 1)
}


function updateSidebar() {

	switch(state) {

		case IDLE:
		d3.select("#edge-source").call(fadeOut);
		d3.select("#edge-target").call(fadeOut);
		d3.select("#edge-info").call(fadeOut);
		d3.select("#cta").text("Clicca su un cerchio per esplorare i collegamenti tra politici");


		break;

		case NODE_MODE:

		// d3.select("#cta").text("Clicca su un altro nodo per vedere la relazione");
		// node info
		d3.select("#edge-source").call(fadeIn);
		d3.select("#edge-target").call(fadeOut);
		d3.select("#edge-info").call(fadeOut);
		updateNodeInfo(d3.select("#edge-source"), selectedSource);
		break;

		case LINK_MODE:
		d3.select("#edge-source").call(fadeIn);
		d3.select("#edge-target").call(fadeIn);
		d3.select("#edge-info").call(fadeIn);
		

		d3.select("#edge-names").text(`${selectedSource.name} – ${selectedTarget.name}`);
		d3.select("#similarity").text(selectedEdge.weight);

		updateNodeInfo(d3.select("#edge-source"), selectedSource);
		updateNodeInfo(d3.select("#edge-target"), selectedTarget);

		// append words in common

		appendWords();




		break;
	}
}

function appendWords() {

	let isSourceFirst = selectedSource.id < selectedTarget.id;
	let correlatedSourceWords = isSourceFirst ? selectedEdge.words.most_correlated_with_source : selectedEdge.words.most_correlated_with_target;
	let correlatedTargetWords = !isSourceFirst ? selectedEdge.words.most_correlated_with_source : selectedEdge.words.most_correlated_with_target;



	let $correlated_with_source = d3.select("#edge-most_correlated_with_source");

	$correlated_with_source
	.select("h3")
	.text(`${selectedSource.name}`);

	$correlated_with_source
	.select("ul")
	.datum(correlatedSourceWords)
	.call(populateList);

	let $correlated_with_both = d3.select("#edge-most_correlated_with_both");

	$correlated_with_both
	.select("h3")
	.text(`entrambe`);


	$correlated_with_both
	.select("ul")
	.datum(selectedEdge.words.most_correlated_with_both)
	.call(populateList);

	let $correlated_with_target = d3.select("#edge-most_correlated_with_target");

	$correlated_with_target
	.select("h3")
	.text(`${selectedTarget.name}`);


	$correlated_with_target
	.select("ul")
	.datum(correlatedTargetWords)
	.call(populateList);


	function populateList(el) {
		el
		.html("")
		.selectAll("li")
		.data(d=>d)
		.enter()
		.append("li")
		.text(d=>d[0]);
	}
}


function updateNodes() {

	switch(state) {

		case IDLE: {
			nodes
			.style("opacity", 1)
			.select(".nodeimage")
			.style("pointer-events", "auto");
			break;
		}

		case NODE_MODE: {

			const targetNodes = graph.edges.map(d=>{
				if(d.source==selectedSource) return d.target;
				if(d.target==selectedSource) return d.source;
			}).filter(d=>d!=undefined);

			nodes.each(function(d){
				let el = d3.select(this);
				let selected = targetNodes.indexOf(d) != -1 || d == selectedSource;
				el
				.style("opacity", selected ? 1 : .1)
				.select(".nodeimage")
				.style("pointer-events", selected ? "auto" : "none");
			});
			break;
		}

		case LINK_MODE: {


			nodes.each(function(d){
				let el = d3.select(this);
				let selected = d == selectedTarget || d == selectedSource;

				el
				.style("opacity", d=> d == selectedTarget || d == selectedSource ? 1 : 0)
				.select(".nodeimage")
				.style("pointer-events", selected ? "auto" : "none")
			});
			break;
		}
	}

}

function updateEdgeStrokes() {

	let edges = edgesCont
	.selectAll(".edge");

	edges
	.each(function(d){
		var el = d3.select(this).node();
		if(d.source == selectedSource || d.target == selectedSource) {
			el.parentNode.appendChild(el);
		}
	});

	edges
	.select("line")
	.each(function(d){
		let el = d3.select(this);


		let isActive = d.target == selectedSource || d.source == selectedSource;
		let gradientName;
		gradientName = getGradientName(d.source.party, d.target.party);			
		switch(state) {
			case IDLE: {
				el
				.attr("stroke-width", strokeScale(d.weight))
				// .attr("stroke", "#ddd");
				// .attr("stroke-width", isActive ? strokeScale(d.weight) : 1)
				.attr("stroke", `url(#${gradientName})`)
				.transition()
				.style("opacity", .25)
				break;
			}

			case NODE_MODE: {
				el
				.attr("stroke-width", strokeScale(d.weight))
				.attr("stroke", `url(#${gradientName})`)
				.style("opacity", isActive ? 1 : 0)
				break;
			}

			case LINK_MODE: {
				let isLinking = (d.target==selectedTarget || d.source==selectedTarget);
				el
				.attr("stroke-width", isActive && isLinking ? strokeScale(d.weight) : 1)
				.style("opacity", isActive && isLinking ? 1 : 0);
				break;
			}
		}

	});

}


function onNodeDown(d) {

	switch(state) {

		case IDLE:
		selectedSource = d;
		state = NODE_MODE;
		break;

		case NODE_MODE:
		if(selectedSource == d) {
			selectedSource = null;
			state = IDLE;
		} else {
			selectedTarget = d;
			selectedEdge = findEdgeBetweenNodes(selectedSource, selectedTarget);
			state = LINK_MODE;
		}
		break;

		case LINK_MODE:
		selectedSource = d;
		selectedTarget = null;
		state = NODE_MODE;
		break;

	}

	update();
}

function update(){
	updateEdgeStrokes();
	updateNodes();
	updateSidebar();
}

function updateNodeInfo(el, d) {


	el.select(".sidebar-nodetweets").text(`${d.tweets} tweets`);
	el.select(".sidebar-nodeimage").style("background-image", getImage(d)).style("border", `3px solid ${colorScale(d.party)}`)
	el.select(".sidebar-nodename").text(d.name);
	el.select(".node-party").text(d.party).style("color", colorScale(d.party));
	el.select(".node-most-used").html(`<b>Parole più usate: </b> ${d.most_important_words.map(d=>d[0]).join(", ")}`)


}

function getImage(d) {
	return `url(images/${d.twitter.substr(1)}.jpg)`;
}

function getGradientName(source, target) {
	let regex  = /\s/g;
	return `${source.replace(regex, "")}${target.replace(regex, "")}`.toLowerCase();
}
