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
var strokeScale = d3.scaleLinear().clamp(true).range([1,5]);
var distanceScale = d3.scaleLinear().clamp(true).range([400,100]); // lighter weight correspond to higher distances

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
	// SLIDER 
	// d3.select("#threshrangestart")
	// .attr("value", 0.0)
	// .attr("step", 0.01)
	// .attr("max", thresholds[0]*1000)
	// .on("input", function(){changeThreshold(0,this.value);});
	
	// d3.select("#threshrangeend")
	// .attr("value", thresholds[1]*1000)
	// .attr("step", 0.01)
	// .attr("max", thresholds[1]*1000)
	// .on("input", function(){changeThreshold(1,this.value);});



	window.document.body.onkeydown = (d)=> {
		shiftPressed = (d.code=="ShiftLeft" || d.code=="ShiftRight")
	};

	window.document.body.onkeyup = (d)=> {
		shiftPressed = false
	};

	setupSlider(quantile_extent, updateThresholds);

	// n.oninput = function(){console.log(this.value)}
	// .on("mousedown", function(){console.log(this.value)})


	distanceScale.domain(quantile_extent);
	strokeScale.domain(quantile_extent);
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

	d3.select("input#all")
	.on("change", function(d) {
		console.log("asdf")
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

	link = edgesCont.selectAll(".link")
	.data(currentGraph.edges, (d)=>d.id); 

	link
	.enter()
	.append("line")
	.attr("class", "link")
	.attr("stroke-width", (d)=>strokeScale(d.weight)) 
	.style("stroke-opacity", (d)=> opacityScale(d.weight))
	.on("mouseover", (d)=>updateEdgeTooltip(d))
	.on("mousemove", ()=>tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
	.on("mouseout", (d)=>updateEdgeTooltip(null));
	// .attr("stroke-dasharray", (d)=> (d.weight > thresholds[]_1 ? dashScale(d.weight) : 0 ));

	link
	.exit()
	.remove();

	node = nodesCont.selectAll(".node")
	.data(currentGraph.nodes, (d)=>d.name);

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
	.on("mousedown", (d)=>{
		if(shiftPressed) {

			setTimeout(()=>{
				removeNode(d)
				updateGraph()
			}, 100)
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

	d3.selectAll("#sidebar #list input")
	.attr("checked", (d)=>currentGraph.nodes.indexOf(d)!=-1 ? true : null)

	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("link", d3.forceLink())
		.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets)))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.on("tick", ticked);
	}
	simulation.nodes(currentGraph.nodes)


	simulation.force("link")
	.links(currentGraph.edges)
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


