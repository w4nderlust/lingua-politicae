const DEBUG = false;
const PARTIES = ["M5S", "piùEuropa", "Lega Nord", "Forza Italia", "Potere Al Popolo",  "fratelli", "PD",  "Liberi e Uguali", "Casa Pound"];
const PARTYCOLORS  = ["#FCDA1B", "#2D9DB4", "#299733", "#13487B", "#DE0016", "#151653", "#EB733F", "#DE0000", "#000000"];

let container = d3.select("#container");
let width = container.node().getBoundingClientRect().width;
let height = container.node().getBoundingClientRect().height;


let svg = container.select("svg").attr("height", height);
let edgesCont = svg.append("g").attr("id", "edgesCont");
let nodesCont = d3.select("#nodecontainer");

// TOOLTIP
let sidebar =d3.select("#sidebar");

// SCALES
let radiusScale = d3.scaleSqrt().clamp(true).range([50,80]);
let strokeScale = d3.scaleLinear().clamp(true).range([2,10]);
let distanceScale = d3.scaleLinear().clamp(true).range([width*.15,10]); // lighter weight correspond to higher distances
let colorScale = d3.scaleOrdinal().range(PARTYCOLORS).domain(PARTIES);

// STATE
const IDLE = 0;
const NODE_MODE = 1;
const LINK_MODE = 2;
let state = IDLE;
let selectedSource;
let selectedTarget;
let selectedEdge;

// GRADIENTS
let gradients = [];
PARTIES.forEach(d=>{
	PARTIES.forEach(dd=>{
		if(dd!=d) {
			gradients.push({
				source:{
					party:d
				},
				target:{
					party:dd
				},
			});
		}
	});
	gradients.push({
		source:{
			party:d
		},
		target:{
			party:d
		},
	});
});



let gradient = svg
.append("defs")
.selectAll("linearGradient")
.data(gradients)
.enter()
.append("linearGradient")
.attr("id", d=>getGradientName(d.source, d.target));

gradient.append("stop")
.attr("stop-color", d=>colorScale(d.source.party))
.attr("offset", "0%");

gradient.append("stop")
.attr("stop-color", d=>colorScale(d.target.party))
.attr("offset", "100%");


// DATA
let graph;
let nodes; 

// PHYSICS
let simulation;



// START
d3.json("politicians_graph.json", onLoaded);



function onLoaded(error, data) {
	if (error) throw error;

	let parties = {};
	data.nodes.forEach(d=>{if(!parties[d.party]) parties[d.party]= d;});

	graph = data;
	
	if(DEBUG) {
		graph.nodes = graph.nodes.slice(0,2);
		graph.edges = graph.edges.filter(d=>(d.source==0 || d.source==1) && (d.target==0 || d.target==1));
	}

	// assign id based on indices
	graph.nodes.forEach((d,i)=> d.id=i);
	graph.edges = graph.edges.filter(d=>d.weight > 0.1);

	// update scales
	let sortedWeights = graph.edges.map((d)=>d.weight).sort();
	let quantileExtent = [d3.quantile(sortedWeights, 0.05), d3.quantile(sortedWeights, 0.95)];

	distanceScale.domain(quantileExtent);
	strokeScale.domain(quantileExtent);
	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));


	updateGraph();
}


function updateGraph() {

	let edges = graph.edges;

	let edge = edgesCont.selectAll(".edge")
	.data(edges, (d)=>d.id); 

	let edgeGroups = edge
	.enter()
	.append("g")
	.attr("class", "edge")
	.on("mouseover", function(d){updateEdgeSidebar(d, d3.select(this));})
	.on("mouseout", function(){updateEdgeSidebar(null, null);});

	edgeGroups
	.append("rect")
	.attr("width",10)
	.attr("height",1);



	nodes = nodesCont.selectAll(".node")
	.data(graph.nodes, (d)=>d.name)
	.enter()
	.append("div")
	.attr("class", "node")
	// .on("mouseover", onNodeOver)
	.on("mousedown", onNodeDown)
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

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
	.style("background-image", d=>`url(images/${d.twitter.substr(1)}.jpg)`)
	.style("border-radius", (d)=> (radiusScale(d.tweets)/2)+"px")
	.style("width", (d)=> radiusScale(d.tweets)+"px")
	.style("height", (d)=> radiusScale(d.tweets)+"px");
	


	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("edge", d3.forceLink())
		.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets)))
		.force("center", d3.forceCenter(width * .7, height * .5))
		.on("tick", ticked);
	}

	simulation.nodes(graph.nodes);


	simulation.force("edge")
	.links(graph.edges)
	.distance((d)=> {
		return distanceScale(d.weight) + 200;
	});

	updateEdgeStrokes();
}


function ticked() {
	edgesCont.selectAll(".edge")
	.attr("transform", d=>`translate(${d.source.x} ${d.source.y})`)
	.select("rect")
	.attr("width", d=>{
		let dx = d.target.x - d.source.x;
		let dy = d.target.y - d.source.y;
		return Math.sqrt(dx*dx + dy*dy);
	})
	.attr("transform", d=>{
		let a = Math.atan2(d.target.y-d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
		return `rotate(${a})`;
	});

	nodes
	.style("transform", d=>`translate(${d.x}px, ${d.y}px)`);

}

function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}


function onNodeOver(node) {

	if(!selectedSource || node.id == selectedSource.id) return;
	let edge = findEdgeBetweenNodes(node, selectedSource);

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

function updateEdgeSidebar(edge, el) {
}

function updateSidebar() {

	switch(state) {
		
		case IDLE:
		nodes.select(".nodeimage").style("opacity", 1);
		break;

		case NODE_MODE:
		let targetNodes = graph.edges.map(d=>{
			if(d.source==selectedSource) return d.target;
			if(d.target==selectedSource) return d.source;
		}).filter(d=>d!=undefined);

		nodes.each(function(d){
			let el = d3.select(this);
			let selected = targetNodes.indexOf(d) != -1 || d == selectedSource 
			el.style("pointer-events", selected ? "auto" : "none");
			el.select(".nodeimage").style("opacity", selected ? 1 : .5);
		});
		break;

		case LINK_MODE:
		nodes.select(".nodeimage").style("opacity", d=> d == selectedTarget || d == selectedSource ? 1 : .5);
		break;
	}

	switch(state) {
		
		case IDLE:
		d3.select("#node-info").style("display", "none");
		d3.select("#edge-info").style("display", "none");
		break;

		case NODE_MODE:

		d3.select("#node-info").style("display", "block");
		d3.select("#node-name").text(selectedSource.name);
		d3.select("#node-party").text(selectedSource.party);
		d3.select("#edge-info").style("display", "none");

		break;

		case LINK_MODE:

		d3.select("#node-info").style("display", "none");
		d3.select("#edge-info").style("display", "block");
		d3.select("#edge-names").text(`${selectedSource.name} – ${selectedTarget.name}`);
		
		
		// append words in common
		
		d3.select("#edge-most-similar")
		.selectAll("li")
		.data(selectedEdge.words.most_similar)
		.enter()
		.append("li")
		.text(d=>d[0]);

		d3.select("#edge-most-different")
		.selectAll("li")
		.data(selectedEdge.words.most_different)
		.enter()
		.append("li")
		.text(d=>d[0]);


		break;
	}


}

function updateNodes() {

	switch(state) {
		
		case IDLE:
		nodes.select(".nodeimage").style("opacity", 1);
		break;

		case NODE_MODE:
		let targetNodes = graph.edges.map(d=>{
			if(d.source==selectedSource) return d.target;
			if(d.target==selectedSource) return d.source;
		}).filter(d=>d!=undefined);

		nodes.each(function(d){
			let el = d3.select(this);
			let selected = targetNodes.indexOf(d) != -1 || d == selectedSource 
			el.style("pointer-events", selected ? "auto" : "none");
			el.select(".nodeimage").style("opacity", selected ? 1 : .1);
		});
		break;

		case LINK_MODE:
		nodes.select(".nodeimage").style("opacity", d=> d == selectedTarget || d == selectedSource ? 1 : .1);
		break;
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
	.select("rect")
	.each(function(d){
		let el = d3.select(this);


		let isActive = d.target == selectedSource || d.source == selectedSource;
		let gradientName;
		if(isActive) gradientName = getGradientName(d.source, d.target);			

		switch(state) {
			case IDLE:
			el.transition().attr("height", isActive ? strokeScale(d.weight) : 1).attr("fill", "#ddd");
			break;

			case NODE_MODE:
			el.attr("fill", gradientName ? `url(#${gradientName})` : "#ddd");
			el.transition().attr("height", isActive ? strokeScale(d.weight) : 1);
			break;

			case LINK_MODE:
			let isLinking = (d.target==selectedTarget || d.source==selectedTarget);
			el.attr("fill", isLinking  ? `url(#${gradientName})` : "#ddd");
			el.transition().attr("height", isActive && isLinking ? strokeScale(d.weight) : 1);
			break;
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
		if(selectedSource == d) {
			selectedTarget = null;
			state = NODE_MODE;
		} else if(selectedTarget == d) {
			selectedTarget = null;
			selectedSource = d;
			state = NODE_MODE;
		} 
		break;

	}
	
	updateEdgeStrokes();
	updateNodes();
	updateSidebar();

}

function getGradientName(source, target) {
	return `${source.party.replace(/\s/g, "-")}-${target.party.replace(/\s/g, "-")}`;
}

function addBoxToText() {
	let bbox = text.node().getBoundingClientRect();
	let padding = 3;

	el
	.insert("rect", ":first-child")
	.attr("x", bbox.x - padding)
	.attr("y", -bbox.height-padding*.5)
	.attr("height", bbox.height + padding * 2)
	.attr("width", bbox.width + padding * 2)
	.style("fill", "rgba(255,255,255,1)");
}