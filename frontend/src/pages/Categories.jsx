import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService } from '../services/api';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentCategory, setCurrentCategory] = useState({
    categoryName: '',
    description: '',
    gstPercentage: 0
  });
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll();
      if (Array.isArray(res.data)) setCategories(res.data);
      else setCategories([]);
    } catch (e) {
      console.error('Failed to fetch categories', e);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = categories.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      (c.categoryName || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        categoryName: currentCategory.categoryName,
        description: currentCategory.description,
        gstPercentage: currentCategory.gstPercentage
      };

      if (editingId) {
        await categoryService.update(editingId, payload);
      } else {
        await categoryService.create(payload);
      }
      setShowModal(false);
      setCurrentCategory({ categoryName: '', description: '', gstPercentage: 0 });
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.error || (editingId ? 'Failed to update category' : 'Failed to create category'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoryService.delete(id);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete category');
    }
  };

  return (
    <div className="categories-container">
      <div className="categories-header">
        <div>
          <h1>🏷️ Categories</h1>
          <p>View all categories and create new ones</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button
            className="add-button"
            onClick={() => {
              setCurrentCategory({ categoryName: '', description: '', gstPercentage: 0 });
              setEditingId(null);
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Create Category
          </button>
        </div>
      </div>

      <div className="categories-toolbar">
        <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-actions" />
      </div>

      <div className="categories-table-container">
        <table className="categories-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>GST %</th>
              <th>Description</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="loading">Loading categories...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">No categories found</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.categoryId}>
                  <td>{c.categoryName}</td>
                  <td>{c.gstPercentage ?? 0}%</td>
                  <td>{c.description || '-'}</td>
                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => {
                        setCurrentCategory({
                          categoryName: c.categoryName || '',
                          description: c.description || '',
                          gstPercentage: typeof c.gstPercentage === 'number' ? c.gstPercentage : parseInt(c.gstPercentage ?? 0, 10)
                        });
                        setEditingId(c.categoryId);
                        setShowModal(true);
                      }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button className="remove-btn" onClick={() => handleDelete(c.categoryId)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Category' : 'Create Category'}</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setCurrentCategory({ categoryName: '', description: '', gstPercentage: 0 });
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="category-form">
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={currentCategory.categoryName}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, categoryName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>GST %</label>
                <select
                  value={currentCategory.gstPercentage}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, gstPercentage: parseInt(e.target.value, 10) })}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="textarea-input"
                  rows="3"
                  value={currentCategory.description}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

