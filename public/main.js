var thresholds = [0.001, 0.008];
var shiftPressed = false;
var selectedNode = null

var PARTIES = ["M5S", "piùEuropa", "Lega Nord", "Forza Italia", "Potere Al Popolo",  "Fratelli d'Italia", "PD",  "Liberi e Uguali", "Casa Pound"];
var PARTYCOLORS  = ["#FCDA1B", "#2D9DB4", "#299733", "#13487B", "#DE0016", "#151653", "#EB733F", "#DE0000", "black"];

// DATA
var graph;
var currentGraph;

// NODES
var svg = d3.select("svg");
var width = window.document.body.clientWidth;
var height = window.document.body.clientHeight;
svg.attr("height", height);
svg.on("mousemove", updateTooltipPosition)

var edgesCont = svg.append("g").attr("id", "edgesCont");
var nodesCont = svg.append("g");

// TOOLTIP
var tooltip =d3.select("body").append("div").attr("id", "tooltip").style("visibility", "hidden");

// SCALES
var radiusScale = d3.scaleSqrt().clamp(true).range([10,40]);
var strokeScale = d3.scaleLinear().clamp(true).range([1,5]);
var distanceScale = d3.scaleLinear().clamp(true).range([width*.2,10]); // lighter weight correspond to higher distances
var colorScale = d3.scaleOrdinal()
.range(PARTYCOLORS)
.domain(PARTIES)



// PHYSICS
var simulation;

var link, node, text;


// FUNCTIONS
function onLoaded(error, data) {

	let partiti = {}
	data.nodes.forEach(d=>{if(!partiti[d.partito]) partiti[d.partito]= d;})
	console.log(Object.keys(partiti));

	if (error) throw error;
	graph = data;
	// assign id based on indices
	graph.nodes.forEach((d,i)=> d.id=i);
	// sort names alphabetically
	graph.nodes.sort((a, b) => a.name !== b.name ? a.name < b.name ? -1 : 1 : 0);
	// update scales
	regular_extent = d3.extent(graph.edges, (d)=>d.weight);
	sorted_weights = graph.edges.map((d)=>d.weight).sort();
	quantile_extent = [d3.quantile(sorted_weights, 0.05), d3.quantile(sorted_weights, 0.95)];
	thresholds = quantile_extent;

	// setupSlider(quantile_extent, updateThresholds);

	distanceScale.domain(quantile_extent);
	strokeScale.domain(quantile_extent);

	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));

	currentGraph = {};
	currentGraph.nodes = [];
	currentGraph.edges = [];

	// initUI();
	


	d3.select("#selectAllLabel").select("input").property("checked", true)
	currentGraph.nodes = graph.nodes;
	currentGraph.edges = graph.edges;
	updateGraph();

}

function addNode(d) {
	var index = graph.nodes.indexOf(d);
	currentGraph.nodes.push(graph.nodes[index]);
}

function setEdges() {
	currentGraph.edges = [];
	for (var k = 0; k < currentGraph.nodes.length; k++) {
		var nodeIndex = currentGraph.nodes[k].id;
		for (var i = 0; i < graph.edges.length; i++) {
			var g = graph.edges[i];
			// check if target is between the current nodes
			var target = getNodeById(+g.target);
			if(g.source == nodeIndex && target) {
				// I had to redo this because the id function of links wasn't working properly!
				currentGraph.edges.push({
					words: g.words,
					weight: g.weight,
					source: k,
					target: currentGraph.nodes.indexOf(target)
				});
			}
		}
	}
}

function getNodeById(id) {
	return currentGraph.nodes.filter((d)=>d.id == id)[0];
}

function removeNode(d) {
	var i = currentGraph.nodes.indexOf(d);
	currentGraph.nodes.splice(i,1);
}

function initUI() {

	let selectAllLabel = d3.select("#sidebar")
	.append("label")
	.attr("id", "selectAllLabel")
	
	selectAllLabel.append("input")
	.attr("type", "checkbox")
	.on("change", function(d) {

		currentGraph.nodes = [];
		currentGraph.edges = [];

		if(d3.select(this).node().checked) {
			currentGraph.nodes = currentGraph.nodes.concat(graph.nodes);
			currentGraph.edges = currentGraph.edges.concat(graph.edges);
		} 
		updateGraph();
	});
	
	selectAllLabel
	.append("span")
	.text("Seleziona tutti");

	// nest by parties
	let parties = {};
	let n = graph.nodes.forEach(d=>{
		if(!parties[d.partito]) {
			parties[d.partito] = [];
		}
		parties[d.partito].push(d);
	});
	parties = Object.keys(parties).map(d=>parties[d]);


	var divs = d3.select("#sidebar")
	.selectAll("div")
	.data(parties)
	.enter()
	.append("div")

	divs
	.append("h4")
	.text(d=>d[0].partito)
	
	let table = divs
	.append("table");

	table
	.selectAll("tr")
	.data(d=>Object.keys(d).map(dd=>d[dd]))
	.enter()
	.append("tr")

	.each(function(d) {
		let el = d3.select(this);
		
		
		let label = el.append("label");

		label
		.append("input")
		.attr("type", "checkbox")
		.attr("id", (d)=>d.name)
		.attr("checked", currentGraph.nodes.indexOf(d) != -1 ? "true" : null)
		.on("change", function(d) {
			var isAdding = d3.event.target.checked;
			isAdding ? addNode(d) : removeNode(d);
			updateGraph();
		});


		label
		.append("span")
		.text(d.name);

	});
}


function updateGraph() {

	setEdges();
	currentGraph.edges = currentGraph.edges.filter((d)=> d.weight > thresholds[0]);
	currentGraph.edges = currentGraph.edges.filter((d)=> d.weight < thresholds[1]);

	link = edgesCont.selectAll(".link")
	.data(currentGraph.edges, (d)=>d.id); 

	let linkGroups = link
	.enter()
	.append("g")
	.attr("class", "link")
	.style("opacity", .7)
	.on("mouseover", function(d){updateEdgeTooltip(d, d3.select(this))})
	.on("mouseout", function(d){updateEdgeTooltip(null, d3.select(this))});

	linkGroups
	.append("line")
	.attr("stroke-width", 10) 
	.style("stroke-opacity", 0)


	linkGroups
	.append("line")
	.attr("class", "realLink")
	.attr("stroke-width", (d)=>strokeScale(d.weight)) 


	link
	.exit()
	.remove();

	node = nodesCont.selectAll(".node")
	.data(currentGraph.nodes, (d)=>d.name);

	node
	.enter()
	.append("circle")
	.on("mouseover", function(d){updateTooltip(d, d3.select(this))})
	.on("mouseout", function(d){updateTooltip(null, d3.select(this))})
	.attr("class", "node")
	.attr("r", (d)=> (radiusScale(d.tweets)))
	.attr("fill", d=>colorScale(d.partito))
	.style("fill-opacity", 1)
	.on("mousedown", (d)=>{
		if(shiftPressed) {
			// setTimeout(()=>{
				// 	removeNode(d)
				// 	updateGraph()
				// }, 100)
			} else {
				updateSelectedNode(d);
			}
		})
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

	node
	.exit()
	.remove();


	text = svg
	.selectAll(".label")
	.data(currentGraph.nodes);

	var labelGroup = text
	.enter()
	.append("g")
	.attr("class", "label")
	.each(function(d){

		var el = d3.select(this);

		var text = el
		.append("text")
		.attr("text-anchor", "middle")
		.attr("fill", "black")
		.text(d.name);

	})



	text
	.exit()
	.remove();

	d3.selectAll("#sidebar #list input")
	.attr("checked", (d)=>currentGraph.nodes.indexOf(d)!=-1 ? true : null)

	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("link", d3.forceLink())
		.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets)*2))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.on("tick", ticked);
	}
	simulation.nodes(currentGraph.nodes)


	simulation.force("link")
	.links(currentGraph.edges)
	.distance((d)=> {
		return distanceScale(d.weight) + 200;
	});
}

function updateSelectedNode(d) {

	d.selected = true;
	selectedNode = d;

	d3.selectAll(".link")
	.each(function(d){
		
		let el = d3.select(this);

		el.style("cursor",  edge=> edge.source.id == selectedNode.id ? "pointer" : "default");

		el
		.style("opacity", edge=> edge.source.id == selectedNode.id ? 1 : .7)

		el	
		.select(".realLink")
		.style("stroke", edge=> edge.source.id == selectedNode.id ? colorScale(edge.source.partito) : "#ddd")

		let node = el.node();
		if( d.source.id == selectedNode.id) {
			node.parentNode.appendChild(node)
		}
	})

}

function ticked() {
	svg.selectAll(".link").selectAll("line")
	.attr("x1", (d)=> d.source.x)
	.attr("y1", (d)=> d.source.y)
	.attr("x2", (d)=> d.target.x)
	.attr("y2", (d)=> d.target.y);

	svg.selectAll(".node")
	.attr("cx", (d)=> d.x)
	.attr("cy", (d)=> d.y);

	svg.selectAll(".label")
	.attr("transform", d=>`translate(${d.x}, ${d.y + radiusScale(d.tweets) + 10})`)

}

function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
	updateTooltipPosition();
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}

function updateEdgeTooltip(d, el) {

	if(!selectedNode) return;
	var t;

	if(d && d.source.id == selectedNode.id) {

		d3.selectAll("circle")
		.attr("stroke", node=> node.id === d.target.id  || node.id === d.source.id  ? "black" : "none")
		.attr("stroke-width", node=> node.id === d.target.id  || node.id === d.source.id  ? 3 :0);

		console.log(el.node());
		el
		.select(".realLink")
		.style("stroke", "black")

		t = d.words.most_similar[0][0];

		if(d.source.id == selectedNode.id) {

			tooltip
			.style("visibility", d !== null ? "visible" :"hidden")
			
			tooltip
			.append("h3")
			.text(`${d.source.name} – ${d.target.name} `)

			tooltip
			.append("h4")
			.text("Parole in comune più usate")

			tooltip
			.append("p")
			.text(d.words.most_similar.map(d=>d[0]).join(", "))
			// .append("ul")
			// .selectAll("li")
			// .data(d.words.most_similar)
			// .enter()
			// .append("li")
			// .text(d=>d[0]);

			tooltip
			.append("h4")
			.text("Parole in comune meno usate")

			tooltip
			.append("p")
			.text(d.words.most_different.map(d=>d[0]).join(", "))
			// .append("ul")
			// .selectAll("li")
			// .data(d.words.most_different)
			// .enter()
			// .append("li")
			// .text(d=>d[0]);



		}


	} else {
		t = "";

		tooltip
		.style("visibility", "hidden")
		.html("");

		d3.selectAll(".realLink")
		.style("stroke", d=> d.source.id == selectedNode.id ? colorScale(d.source.partito) : "#ddd")
		

	}
	
	
}

function updateTooltip(d, el) {

	return;
	var t;
	if(d) {
		t =d.tweets + " tweets";
		tooltip
		.style("visibility", "visible")
		.html(`<p>${t}</p>`)

	} else {
		t = "";
		tooltip
		.style("visibility", "hidden")
		.html("");
	}
	el.attr("stroke", d ? "black" : "none")

}


function updateTooltipPosition(){
	tooltip.style("transform", `translate(${d3.event.x + 20 }px, ${d3.event.y - 20}px)`);
}

function changeThreshold(index, value) {
	thresholds[index] = value * 0.01;
	updateGraph();
}


function setupSlider(extent, updateGraph, color){

	var sliderVals = extent;
	var width = +d3.select("#sidebar").node().getBoundingClientRect().width*.7;

	var svg = d3.select("#slider1").append("svg")
	.attr('width', width)
	.attr('height', 50)
	.attr("transform", "translate(-10,0)");

	var x = d3.scaleLinear()
	.domain(extent)
	.range([20, width-20])
	.clamp(true);

	var xMin=0;
	var xMax=width;

	var slider = svg.append("g")
	.attr("class", "slider")
	.attr("transform", "translate(0,20)");

	slider.append("line")
	.attr("class", "track")
	.attr("x1", x.range()[0])
	.attr("x2", x.range()[1]);

	var selRange = slider.append("line")
	.attr("class", "sel-range");

	var handle = slider.selectAll("rect")
	.data(sliderVals)
	.enter()
	.append("circle", ".track-overlay")
	.attr("class", "handle")
	.attr("cy", 0)
	.attr("rx", 3)
	.attr("r", 8)
	.call(
		d3.drag()
		.on("start", startDrag)
		.on("drag", drag)
		.on("end", endDrag)
		);

	var handleText = slider.selectAll("text")
	.data(sliderVals)
	.enter()
	.append("text")
	.attr("text-anchor", "middle")
	.attr("y", 20)
	
	updateSlider();

	function startDrag(){
		d3.select(this).raise().classed("active", true);
	}

	function drag(d,i){
		var x1= x.invert(d3.event.x);
		if(i==0) x1 = Math.min(sliderVals[1], x1);
		if(i==1) x1 = Math.max(sliderVals[0], x1);
		sliderVals[i] = x1;
		updateSlider();
	}

	function updateSlider() {
		
		handle
		.data(sliderVals)
		.attr("cx", (d) =>x(d))

		selRange
		.attr("x1", x(sliderVals[0]))
		.attr("x2", x(sliderVals[1]))

		
		handleText
		.data(sliderVals)
		.attr("x", function(d) { return x(d); })
		.text(function(d) { return Math.round(x(d)/100*100); })

	}

	function endDrag(d){
		updateThresholds(sliderVals[0],sliderVals[1])
		// updateGraph();
	}

}
function updateThresholds(a,b) {

	thresholds[0] = a;
	thresholds[1] = b;
	updateGraph();
}


// START
d3.json("politicians_graph.json", onLoaded)


