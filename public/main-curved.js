/* jshint unused:true, esversion: 6 */	
var thresholds = [0.001, 0.008];
var shiftPressed = false;


// DATA
var graph;
var currentGraph;

// NODES
var svg = d3.select("svg");
var width = window.document.body.clientWidth*.7;
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
// var dashScale = d3.scaleQuantize().domain([thresholds[0], thresholds[1], 1]).range(["5,5","5,10","5,20"]);
// var color = d3.scaleOrdinal(d3.schemeCategory20);
var radiusScale = d3.scaleSqrt().clamp(true).range([10,40]);
var opacityScale = d3.scaleLinear().clamp(true).range([0.2,1]);
var strokeScale = d3.scaleLinear().clamp(true).range([1,3]);
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
	regular_extent = d3.extent(graph.edges, (d)=>d.weight);
	sorted_weights = graph.edges.map((d)=>d.weight).sort();
	quantile_extent = [d3.quantile(sorted_weights, 0.05), d3.quantile(sorted_weights, 0.95)];
	thresholds = quantile_extent;
	

	window.document.body.onkeydown = (d)=> {
		shiftPressed = (d.code=="ShiftLeft" || d.code=="ShiftRight")
	};

	window.document.body.onkeyup = (d)=> {
		shiftPressed = false
	};

	setupSlider(quantile_extent, updateThresholds);

	distanceScale.domain(quantile_extent);
	strokeScale.domain(quantile_extent);
	opacityScale.domain(quantile_extent);

	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));

	currentGraph = {};
	currentGraph.nodes = [];
	currentGraph.edges = [];

	// start with the 2 most connected and the 2 least connected nodes
	var ag = graph.edges.sort((a, b) => a.weight !== b.weight ? a.weight < b.weight ? -1 : 1 : 0);
	addNode(graph.nodes[ag[0].source]);
	addNode(graph.nodes[ag[0].target]);
	addNode(graph.nodes[ag[1].source]);
	addNode(graph.nodes[ag[1].target]);
	ag.reverse();
	addNode(graph.nodes[ag[0].source]);
	addNode(graph.nodes[ag[0].target]);
	addNode(graph.nodes[ag[1].source]);
	addNode(graph.nodes[ag[1].target]);
	initUI();
	updateGraph();
}

function addNode(d) {
	var index = graph.nodes.indexOf(d);
	currentGraph.nodes.push(graph.nodes[index]);
}

function setEdges() {

	currentGraph.edges = [];
	currentGraph.bilinks = [];

	// I had to redo this because the id function of links wasn't working properly!
	for (var k = 0; k < currentGraph.nodes.length; k++) {
		var nodeIndex = currentGraph.nodes[k].id;
		for (var i = 0; i < graph.edges.length; i++) {
			var g = graph.edges[i];
			// check if target is between the current nodes
			var target = getNodeById(+g.target);
			if(g.source == nodeIndex && target) {
				
				let targetIndex = currentGraph.nodes.indexOf(target);

				currentGraph.edges.push({
					weight: g.weight,
					source: k,
					target: targetIndex
				});

				if(g.weight < 0.1) {

					// intermediate node 
					let intermediateNode = {isIntermediate:true};
					currentGraph.nodes[k].intermediate = target.intermediate = intermediateNode;
					currentGraph.nodes.push(intermediateNode);
					let intermediateNodeIdex = currentGraph.nodes.length-1;

					currentGraph.edges.push({
						weight: g.weight,
						source: k,
						target: intermediateNodeIdex
					});

					currentGraph.edges.push({
						weight: g.weight,
						source: intermediateNodeIdex,
						target: targetIndex
					});

					currentGraph.bilinks.push({a:[currentGraph.nodes[k], intermediateNode, target], weight:g.weight});
				} else {
					currentGraph.bilinks.push({a: [currentGraph.nodes[k], target], weight:g.weight});
				}
			}
		}
	}
}
function getNodeById(id) {
	return currentGraph.nodes.filter((d)=>d.id == id)[0];
}

function removeNode(d) {
	deleteNodeFromGraph(d);
	if(d.intermediate) deleteNodeFromGraph(d.intermediate);
}

function deleteNodeFromGraph(d){
	var i = currentGraph.nodes.indexOf(d);
	if(i==-1) throw Error("couldn't find node to delete");
	currentGraph.nodes.splice(i,1);
}

function initUI() {

	d3.select("input#all")
	.on("change", function(d) {
		currentGraph.nodes = [].concat(graph.nodes);
		currentGraph.edges = [].concat(graph.edges);
		updateGraph();
	});


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
		.attr("id", (d)=>d.name)
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

	setEdges();
	currentGraph.edges = currentGraph.edges.filter((d)=> d.weight > thresholds[0]);
	currentGraph.edges = currentGraph.edges.filter((d)=> d.weight < thresholds[1]);
	currentGraph.bilinks = currentGraph.bilinks.filter((d)=> d.weight > thresholds[0]);
	currentGraph.bilinks = currentGraph.bilinks.filter((d)=> d.weight < thresholds[1]);

	link = edgesCont.selectAll(".linkContainer")
	.data(currentGraph.bilinks, (d)=>d.a); // set the link array as the accessor

	var linkContainer = link
	.enter()
	.append("g")
	.attr("class", "linkContainer");

	linkContainer
	.append("path")
	.attr("class", "link")
	.attr("stroke-width", (d)=>strokeScale(d.weight)) 
	.style("stroke-opacity", (d)=> opacityScale(d.weight));

	linkContainer
	.append("path")
	.attr("class", "linkHover")
	.on("mouseover", function(d){updateEdgeTooltip(d3.select(this.parentElement).select(".link"), d);})
	.on("mousemove", ()=>tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
	.on("mouseout", function(){updateEdgeTooltip(d3.select(this.parentElement).select(".link"), null);});

	link
	.exit()
	.remove();


	let realNodes = currentGraph.nodes.filter((d)=>!d.isIntermediate);
	node = nodesCont.selectAll(".node")
	.data(realNodes, (d)=>d.name);

	node
	.enter()
	.append("circle")
	.on("mouseover", (d)=>updateTooltip(d))
	.on("mousemove", ()=>tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
	.on("mouseout", ()=>updateTooltip(null))
	.attr("class", "node")
	.attr("r", (d)=> (d.isIntermediate ? 10 : radiusScale(d.tweets)))
	.attr("fill", (d)=>d.isIntermediate? "blue":"red")
	.style("fill-opacity", 1)
	.on("mousedown", (d)=>{
		if(shiftPressed) {
			setTimeout(()=>{
				removeNode(d);
				updateGraph();
			}, 100);
		}
	})
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

	node
	.exit()
	.remove();


	text = d3.select("body")
	.selectAll(".nodeLabel")
	.data(realNodes);

	text
	.enter()
	.append("div")
	.attr("class", "nodeLabel")
	.append("p")
	.style("transform", "translate(-50%,0)")
	.text((d)=> d.name);

	text
	.exit()
	.remove();

	d3.selectAll("#sidebar #list input")
	.attr("checked", (d)=>realNodes.indexOf(d)!=-1 ? true : null);

	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("link", d3.forceLink().distance((d)=>distanceScale(d.weight)).iterations(2))
		.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets) || 10))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.on("tick", ticked);
	}

	simulation.nodes(currentGraph.nodes);
	simulation.alpha(0.1);

	simulation.force("link")
	.links(currentGraph.edges);


}


function ticked() {


	var linkContainer = svg.selectAll(".linkContainer")
	
	linkContainer
	.select(".link")
	.attr("d", positionLink);

	linkContainer
	.select(".linkHover")
	.attr("d", positionLink);

	
	svg.selectAll(".node")
	.attr("transform", (d)=>"translate(" + d.x + "," + d.y + ")");

	d3.select("body").selectAll(".nodeLabel")
	.style("transform", (d)=>"translate(" + d.x + "px," + (d.y + radiusScale(d.tweets)) + "px)");

}

function positionLink(d) {
	if(d.a.length ==3) {
		return "M" + d.a[0].x + "," + d.a[0].y
		+ "S" + d.a[1].x + "," + d.a[1].y
		+ " " + d.a[2].x + "," + d.a[2].y;
	} else {
		return "M" + d.a[0].x + "," + d.a[0].y
		+ "L" + d.a[1].x + "," + d.a[1].y;
	}
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

function updateEdgeTooltip(el, d) {
	el.classed("active", d ? true : null);
	var t = d ? Math.round(d.weight * 100)/100 : "";
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

function changeThreshold(index, value) {
	thresholds[index] = value * 0.01;
	updateGraph();
}


function setupSlider(extent, updateGraph, color){

	var sliderVals = extent;
	var width = +d3.select("#sidebar").node().getBoundingClientRect().width*.8;

	var svg = d3.select("#slider1").append("svg")
	.attr('width', width)
	.attr('height', 50);

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
	.enter().append("circle", ".track-overlay")
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
		updateThresholds(sliderVals[0],sliderVals[1]);
	}

}
function updateThresholds(a,b) {
	thresholds[0] = a;
	thresholds[1] = b;
	updateGraph();
}


// START
d3.json("politicians_graph.json", onLoaded)


