/* jshint unused:true, esversion: 6 */	
const THRESHOLD = 0.1;
const THRESHOLD_1 = 0.3;
const THRESHOLD_2 = 0.5;
// DATA
var graph;
var currentGraph;

// NODES
var svg = d3.select("svg");
var width = window.document.body.clientWidth;
var height = window.document.body.clientHeight;
svg.attr("height", height);
svg.attr("width", width);
var edgesCont = svg.append("g");
var nodesCont = svg.append("g");

// TOOLTIP
var tooltip = d3.select("body")
.append("div")
.style("position", "absolute")
.style("z-index", "10")
.style("visibility", "hidden")
.text("a simple tooltip");

// SCALES
// var dashScale = d3.scaleQuantize().domain([THRESHOLD_1, THRESHOLD_2, 1]).range(["5,5","5,10","5,20"]);
// var color = d3.scaleOrdinal(d3.schemeCategory20);
var radiusScale = d3.scaleSqrt().clamp(true).range([10,40]);
var opacityScale = d3.scaleLinear().clamp(true).range([0.2,1]);
var strokeScale = d3.scaleLinear().clamp(true).range([1,5]);
var distanceScale = d3.scaleLinear().clamp(true).range([400,50]); // lighter weight correspond to higher distances

// PHYSICS
var simulation;

var link, node, text;


// FUNCTIONS


function onLoaded(error, data) {

	if (error) throw error;
	graph = data;
	// assign id based on indices
	graph.nodes.forEach((d,i)=> d.id=i);
	// sort names alphabetically
	graph.nodes.sort((a, b) => a.name !== b.name ? a.name < b.name ? -1 : 1 : 0);
	// update scales
	regular_extent = d3.extent(graph.edges, (d)=>d.weight)
	sorted_weights = graph.edges.map((d)=>d.weight).sort()
	quantile_extent = [d3.quantile(sorted_weights, 0.05), d3.quantile(sorted_weights, 0.95)]

	//distanceScale.domain(d3.extent(graph.edges, (d)=>d.weight));
	distanceScale.domain(quantile_extent);
	//strokeScale.domain(d3.extent(graph.edges, (d)=>d.weight));
	strokeScale.domain(quantile_extent);
	//opacityScale.domain(d3.extent(graph.edges, (d)=>d.weight));
	opacityScale.domain(quantile_extent);

	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));

	currentGraph = {};
	currentGraph.nodes = [];
	currentGraph.edges = [];

	addNode(graph.nodes[0]);
	addNode(graph.nodes[1]);
	addNode(graph.nodes[2]);
	initUI();
	updateGraph();
}

function addNode(d) {
	var index = graph.nodes.indexOf(d);
	currentGraph.nodes.push(graph.nodes[index]);
	findEdges();
}

function findEdges() {
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
	findEdges()
}

function initUI() {
	var inputs = d3.select("#sidebar #list")
	.selectAll("tr")
	.data(graph.nodes)
	.enter()
	.append("tr");

	inputs
	.each(function(d){
		d3.select(this)
		.append("td")
		.append("input")
		.attr("type", "checkbox")
		.attr("name","subscribe")
		.attr("value","newsletter")
		.attr("checked", currentGraph.nodes.indexOf(d) != -1 ? "true" : null)
		.on("change", function(d) {
			var isAdding = d3.event.target.checked;
			isAdding ? addNode(d) : removeNode(d);
			updateGraph();
		});

		d3.select(this)
		.append("td")
		.append("label")
		.attr("for", d.name)
		.text(d.name);

		d3.select(this)
		.append("td")
		.append("label")
		.text(d.tweets);


	});

	
}



function updateGraph() {
	
	// var linkData = currentGraph.edges;
	// linkData = linkData.filter((d)=> d.weight> THRESHOLD);
	link = edgesCont.selectAll(".link")
	.data(currentGraph.edges, (d)=>d.id); 

	link
	.enter()
	.append("line")
	.attr("class", "link")
	.attr("stroke-width", (d)=>strokeScale(d.weight)) //(d)=> (d.weight > THRESHOLD_1? 1:1.5))
	.style("stroke-opacity", (d)=> opacityScale(d.weight))
	.on("mouseover", (d)=>updateEdgeTooltip(d))
	.on("mousemove", ()=>tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
	.on("mouseout", (d)=>updateEdgeTooltip(null));
	// .attr("stroke-dasharray", (d)=> (d.weight > THRESHOLD_1 ? dashScale(d.weight) : 0 ));

	link
	.exit()
	.remove();

	node = nodesCont.selectAll(".node")
	.data(currentGraph.nodes);

	node
	.enter()
	.append("circle")
	.on("mouseover", (d)=>updateTooltip(d))
	.on("mousemove", ()=>tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
	.on("mouseout", (d)=>updateTooltip(null))
	.attr("class", "node")
	.attr("r", (d)=> (radiusScale(d.tweets)))
	.attr("fill", "red")
	.style("fill-opacity", 1)
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

	node
	.exit()
	.remove();


	text = svg
	.selectAll("text")
	.data(currentGraph.nodes);

	text
	.enter()
	.append("text")
	.attr("text-anchor", "middle")
	.attr("fill", "black")
	.text((d)=> d.name);

	text
	.exit()
	.remove();


	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("link", d3.forceLink())
		// .force("charge", d3.forceManyBody().strength(-400))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.on("tick", ticked);
	}
	simulation.nodes(currentGraph.nodes)


	simulation.force("link")
	.links(currentGraph.edges)
		// .id((d)=>{
		// 	console.log(d.id)
		// 	return d.id
		// })
	.distance((d)=> {
		return distanceScale(d.weight);
	});


	}


	function ticked() {
		simulation.alpha(0.1)
		svg.selectAll(".link")
		.attr("x1", (d)=> d.source.x)
		.attr("y1", (d)=> d.source.y)
		.attr("x2", (d)=> d.target.x)
		.attr("y2", (d)=> d.target.y);

		svg.selectAll(".node")
		.attr("cx", (d)=> d.x)
		.attr("cy", (d)=> d.y);

		svg.selectAll("text")
		.attr("x", (d)=>d.x)
		.attr("y", (d)=>d.y);

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

	function updateEdgeTooltip(d) {
		var t;
		if(d) {
			t = Math.round(d.weight * 100)/100;
		} else {
			t = "";
		}
		tooltip
		.style("visibility", d !== null ? "visible" :"hidden")
		.text(t);
	}

	function updateTooltip(d) {
		var t;
		if(d) {
			t =d.tweets + " tweets";
		} else {
			t = "";
		}
		tooltip
		.style("visibility", d !== null ? "visible" :"hidden")
		.text(t);
	}



	// START
	d3.json("politicians_graph.json", onLoaded)


