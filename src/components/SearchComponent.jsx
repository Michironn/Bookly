import React, { useState, useEffect, useRef } from 'react';
import {
  basicSearch,
  fuzzySearch,
  weightedSearch,
  tagSearch,
  advancedSearch,
  autocompleteSuggestions
} from '../utils/searchAlgorithm';
import './SearchComponent.css';

const SearchComponent = ({ items = [], onResultsChange, searchType = 'advanced' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(items);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    tags: [],
    author: '',
    minRating: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const suggestionsRef = useRef(null);

  // Debounce search
  const debounceTimer = useRef(null);

  const performSearch = (searchQuery, filters) => {
    setIsLoading(true);

    setTimeout(() => {
      let searchResults = [];

      if (searchType === 'fuzzy') {
        searchResults = fuzzySearch(items, searchQuery, ['title', 'author', 'description', 'genre']);
      } else if (searchType === 'weighted') {
        searchResults = weightedSearch(items, searchQuery, {
          title: 3,
          author: 2,
          description: 1,
          genre: 2
        });
      } else if (searchType === 'tags') {
        searchResults = tagSearch(items, filters.tags, false);
      } else {
        // Advanced search (default)
        searchResults = advancedSearch(items, {
          query: searchQuery,
          fields: ['title', 'author', 'description', 'genre'],
          tags: filters.tags,
          author: filters.author || undefined,
          minRating: filters.minRating || undefined,
          maxResults: 50
        });
      }

      setResults(searchResults);
      onResultsChange?.(searchResults);
      setIsLoading(false);
    }, 300);
  };

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timer
    clearTimeout(debounceTimer.current);

    // Show suggestions if there's input
    if (value.trim()) {
      const newSuggestions = autocompleteSuggestions(
        items,
        value,
        ['title', 'author', 'genre'],
        8
      );
      setSuggestions(newSuggestions);
      setShowSuggestions(true);

      // Debounce search
      debounceTimer.current = setTimeout(() => {
        performSearch(value, selectedFilters);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setResults(items);
      onResultsChange?.(items);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, selectedFilters);
  };

  const handleFilterChange = (filterType, value) => {
    const updatedFilters = {
      ...selectedFilters,
      [filterType]: value
    };
    setSelectedFilters(updatedFilters);
    performSearch(query, updatedFilters);
  };

  const toggleTag = (tag) => {
    const newTags = selectedFilters.tags.includes(tag)
      ? selectedFilters.tags.filter(t => t !== tag)
      : [...selectedFilters.tags, tag];
    handleFilterChange('tags', newTags);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedFilters({
      tags: [],
      author: '',
      minRating: 0
    });
    setResults(items);
    setSuggestions([]);
    onResultsChange?.(items);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique tags and authors from items
  const uniqueTags = [...new Set(items.flatMap(item => item.tags || []))];
  const uniqueAuthors = [...new Set(items.map(item => item.author))].filter(Boolean);

  return (
    <div className="search-component">
      <div className="search-container">
        <div className="search-input-wrapper" ref={suggestionsRef}>
          <input
            type="text"
            className="search-input"
            placeholder="Search stories, authors, genres..."
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query && suggestions.length > 0 && setShowSuggestions(true)}
          />
          {isLoading && <div className="search-spinner" />}
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="suggestion-icon">🔍</span>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {(query || selectedFilters.tags.length > 0 || selectedFilters.author || selectedFilters.minRating > 0) && (
          <button className="clear-btn" onClick={clearFilters}>
            Clear All
          </button>
        )}
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label className="filter-label">Author</label>
          <select
            className="filter-select"
            value={selectedFilters.author}
            onChange={(e) => handleFilterChange('author', e.target.value)}
          >
            <option value="">All Authors</option>
            {uniqueAuthors.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Minimum Rating</label>
          <select
            className="filter-select"
            value={selectedFilters.minRating}
            onChange={(e) => handleFilterChange('minRating', parseInt(e.target.value))}
          >
            <option value={0}>All Ratings</option>
            <option value={1}>★ 1+</option>
            <option value={2}>★ 2+</option>
            <option value={3}>★ 3+</option>
            <option value={4}>★ 4+</option>
            <option value={5}>★ 5</option>
          </select>
        </div>
      </div>

      {uniqueTags.length > 0 && (
        <div className="tags-section">
          <label className="filter-label">Filter by Tags</label>
          <div className="tags-container">
            {uniqueTags.map(tag => (
              <button
                key={tag}
                className={`tag-button ${selectedFilters.tags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="results-info">
        <span className="result-count">
          Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="results-container">
        {results.length > 0 ? (
          results.map((item, index) => (
            <div key={index} className="result-item">
              <div className="result-header">
                <h3 className="result-title">{item.title}</h3>
                {item.rating && (
                  <div className="result-rating">
                    {'★'.repeat(Math.floor(item.rating))}
                    {item.rating % 1 !== 0 && '½'}
                  </div>
                )}
              </div>
              <p className="result-author">by {item.author}</p>
              {item.description && (
                <p className="result-description">{item.description.substring(0, 150)}...</p>
              )}
              {item.genre && (
                <p className="result-genre"><strong>Genre:</strong> {item.genre}</p>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="result-tags">
                  {item.tags.map(tag => (
                    <span key={tag} className="result-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No stories found. Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchComponent;
