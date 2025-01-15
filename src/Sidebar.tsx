import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

interface ElementInfo {
  tagName: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  dataAttributes: Record<string, string>;
  href?: string;
  textContent?: string;
  children: ElementInfo[];
}

interface DetailedInfo {
  element: ElementInfo;
  parent: ElementInfo | null;
}

const Sidebar: React.FC = () => {
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<DetailedInfo | null>(null);
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === "initState") {
        setIsHighlighting(event.data.state.isHighlighting);
        setSelectedElement(event.data.state.selectedElement);
      } else if (event.data.action === "updateSelectedElements") {
        console.log(event.data.selectedElements);
        setSelectedElement(event.data.selectedElements);
        setIsHighlighting(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleToggle = () => {
    const newState = !isHighlighting;
    setIsHighlighting(newState);
    if (newState) {
      setSelectedElement(null);
    }
    chrome.runtime.sendMessage({ action: "setHighlightState", isHighlighting: newState });
  };

  const handleClose = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "closeSidebar" });
      }
    });
  };

  const toggleExpand = (elementId: string) => {
    setExpandedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  };

  const isDuplicateElement = (newElement: DetailedInfo, existingElements: DetailedInfo[]): boolean => {
    return existingElements.some(el => 
      el.element.tagName === newElement.element.tagName &&
      el.element.id === newElement.element.id &&
      JSON.stringify(el.element.classes) === JSON.stringify(newElement.element.classes) &&
      JSON.stringify(el.element.attributes) === JSON.stringify(newElement.element.attributes)
    );
  };

  const renderElementInfo = (info: ElementInfo, prefix: string = '') => {
    const elementId = `${prefix}`;
    const isExpanded = expandedElements.has(elementId);

    return (
      <div key={elementId} className="mb-2">
        <div 
          className="flex items-center cursor-pointer" 
          onClick={() => toggleExpand(elementId)}
        >
          {info.children.length > 0 ? (
            isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />
          ) : (
            <span className="w-4 h-4 mr-1"></span>
          )}
          <span className="font-semibold">{info.tagName}</span>
          {info.id && <span className="ml-2 text-blue-500">#{info.id}</span>}
        </div>
        {isExpanded && (
          <div className="ml-4">
            {info.id && (
              <div className="text-sm">
                <span className="text-purple-500">id</span>="<span className="text-orange-500">{info.id}</span>"
              </div>
            )}
            {info.href && (
              <div className="text-sm">
                <span className="text-purple-500">href</span>="<span className="text-orange-500">{info.href}</span>"
              </div>
            )}
            {Object.entries(info.dataAttributes).map(([key, value], dataAttrIndex) => (
              <div key={dataAttrIndex} className="text-sm">
                <span className="text-purple-500">{key}</span>="<span className="text-orange-500">{value}</span>"
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderElementDetails = (info: ElementInfo, title: string) => {
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <h3 className="text-md font-semibold mb-3 border-b pb-2">{title}</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-600">Tag Name:</span>
            <span className="font-mono">{info.tagName || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-600">ID:</span>
            <span className="font-mono">{info.id || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-600">Href:</span>
            <span className="font-mono">{info.href || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-600">Inner Text:</span>
            <span className="font-mono">{info.textContent || 'N/A'}</span>
          </div>
          <div className="mt-3">
            <span className="text-gray-600 block mb-2">Data Attributes:</span>
            {Object.keys(info.dataAttributes).length > 0 ? (
              <div className="pl-4 space-y-1">
                {Object.entries(info.dataAttributes).map(([key, value]) => (
                  <div key={key} className="font-mono">
                    {key}: {value}
                  </div>
                ))}
              </div>
            ) : (
              <span className="font-mono">N/A</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-4 bg-gray-100 overflow-auto relative no-select no-hover">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 clickable no-hover-bg no-hover-border focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label="Close sidebar"
      >
        <ArrowRight className="w-5 h-5 text-gray-600" />
      </button>
      <h1 className="text-2xl font-bold text-center text-blue-600 mb-4">DemoPenguin</h1>
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <button
          onClick={handleToggle}
          className={`w-full py-2 px-4 rounded select-none clickable no-hover-bg no-hover-border ${
            isHighlighting
              ? 'bg-pink-500 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          {isHighlighting ? 'Selecting...' : 'Enable Highlight Selector'}
        </button>
      </div>
      {selectedElement && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Selected Elements</h2>
          {renderElementDetails(selectedElement.element, "Selected Element")}
          {selectedElement.parent && 
            renderElementDetails(selectedElement.parent, "Parent Element")
          }
        </div>
      )}
    </div>
  );
};

export default Sidebar;

