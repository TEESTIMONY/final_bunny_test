import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Table, Pagination, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchUsername, setSearchUsername] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [totalUsers, setTotalUsers] = useState(0);

  // Function to fetch users with current filters and pagination
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (currentPage - 1) * limit;
      const response = await axios.get('/api/users', {
        params: {
          limit,
          offset,
          sortBy,
          sortDir,
          username: searchUsername || undefined
        }
      });
      
      setUsers(response.data.users);
      setTotalUsers(response.data.pagination.total);
      
      // Calculate total pages
      const pages = Math.ceil(response.data.pagination.total / limit);
      setTotalPages(pages);
      
      // Adjust current page if needed
      if (currentPage > pages && pages > 0) {
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount and when filters/pagination changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage, limit, sortBy, sortDir]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        // Reset to page 1 when search changes
        setCurrentPage(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchUsername]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort direction if clicking the same field
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new sort field
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // Generate pagination items
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item 
        key={number} 
        active={number === currentPage}
        onClick={() => handlePageChange(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  return (
    <Container className="my-4">
      <h1>Admin Dashboard</h1>
      <h2>User Management</h2>
      
      {/* Filters and Search */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Search by username</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search users..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Sort by</Form.Label>
            <Form.Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="createdAt">Registration Date</option>
              <option value="username">Username</option>
              <option value="email">Email</option>
              <option value="score">Total Score</option>
              <option value="highScore">Highest Game</option>
              <option value="gamesPlayed">Games Played</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Direction</Form.Label>
            <Form.Select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Results per page</Form.Label>
            <Form.Select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      
      {/* Error display */}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* User count */}
          <p>Showing {users.length} of {totalUsers} users</p>
          
          {/* Users table */}
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>UID</th>
                <th 
                  onClick={() => handleSortChange('username')}
                  style={{ cursor: 'pointer' }}
                >
                  Username {sortBy === 'username' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th>Display Name</th>
                <th 
                  onClick={() => handleSortChange('email')}
                  style={{ cursor: 'pointer' }}
                >
                  Email {sortBy === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSortChange('score')}
                  style={{ cursor: 'pointer' }}
                >
                  Total Score {sortBy === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSortChange('highScore')}
                  style={{ cursor: 'pointer' }}
                >
                  Highest Game {sortBy === 'highScore' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSortChange('gamesPlayed')}
                  style={{ cursor: 'pointer' }}
                >
                  Games Played {sortBy === 'gamesPlayed' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSortChange('createdAt')}
                  style={{ cursor: 'pointer' }}
                >
                  Created At {sortBy === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.uid}</td>
                    <td>{user.username}</td>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>{user.score}</td>
                    <td>{user.highScore}</td>
                    <td>{user.gamesPlayed}</td>
                    <td>{user.createdAt}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">No users found</td>
                </tr>
              )}
            </tbody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              <Pagination.First 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage === 1}
              />
              <Pagination.Prev 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {paginationItems}
              <Pagination.Next 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last 
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminDashboard; 