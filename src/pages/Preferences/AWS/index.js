import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';

import theme from 'HPCCloudStyle/Theme.mcss';
import style from 'HPCCloudStyle/PageWithMenu.mcss';

import AWSForm from './AWSForm';
import ActiveList from '../../../panels/ActiveList';
import ButtonBar from '../../../panels/ButtonBar';
import Toolbar from '../../../panels/Toolbar';
import EmptyPlaceholder from '../../../panels/EmptyPlaceholder';
import { breadcrumb } from '..';
import getNetworkError from '../../../utils/getNetworkError';
import get from '../../../utils/get';

import * as Actions from '../../../redux/actions/aws';
import * as NetActions from '../../../redux/actions/network';
import { dispatch } from '../../../redux';

function getActions(disabled, showSave) {
  const ret = [
    { name: 'removeItem', label: 'Delete', icon: style.deleteIcon, disabled },
  ];
  if (showSave) {
    ret.push({
      name: 'saveItem',
      label: 'Save',
      icon: style.saveIcon,
      disabled,
    });
  }
  return ret;
}

/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
class AWSPrefs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      _error: null,
    };
    this.changeItem = this.changeItem.bind(this);
    this.activeChange = this.activeChange.bind(this);
    this.addItem = this.addItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.saveItem = this.saveItem.bind(this);
    this.formAction = this.formAction.bind(this);
  }

  componentDidMount() {
    // this doesn't work without setImmediate ?!
    setImmediate(this.props.onMount);
    this.timeout = null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState._error !== this.state._error) {
      this.timeout = setTimeout(() => {
        this.setState({ _error: null });
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  changeItem(item) {
    const { active, onUpdateItem } = this.props;
    onUpdateItem(active, item);
  }

  activeChange(active) {
    this.setState({ _error: null });
    this.props.onActiveChange(active);
  }

  addItem() {
    if (this.props.error) {
      this.props.invalidateErrors();
    }
    this.setState({ _error: null });
    this.props.onAddItem();
  }

  removeItem() {
    const { list, active, onRemoveItem } = this.props;
    const profileToDelete = list[active];

    if (
      profileToDelete._id &&
      confirm('Are you sure you want to delete this profile?')
    ) {
      onRemoveItem(active, profileToDelete);
    } else if (!profileToDelete._id) {
      onRemoveItem(active, profileToDelete);
    }
    this.setState({ _error: null });
  }

  saveItem() {
    const { onUpdateItem, active, list } = this.props;
    const contents = list[active];
    if (contents._id) {
      this.setState({ _error: 'Profile cannot be modified once saved' });
      return;
    } else if (!contents.name) {
      this.setState({ _error: 'Name cannot be empty' });
      return;
    } else if (!contents.accessKeyId) {
      this.setState({ _error: 'Access keys are required' });
      return;
    }
    this.setState({ _error: null });
    onUpdateItem(active, list[active], true);
  }

  formAction(action) {
    this[action]();
  }

  render() {
    const { active, list, error, buttonsDisabled } = this.props;
    const activeData = active < list.length ? list[active] : null;
    const awsBreadCrumb = breadcrumb(this.props.user, 'EC2');

    let content = null;
    if (list.length) {
      content = (
        <div className={style.content}>
          <AWSForm data={activeData} onChange={this.changeItem} />
          <ButtonBar
            visible={!!activeData}
            onAction={this.formAction}
            error={this.state._error || error}
            actions={getActions(buttonsDisabled, !get(activeData, '_id'))}
          />
        </div>
      );
    } else {
      content = (
        <EmptyPlaceholder
          phrase={
            <span>
              There are no EC2 Profiles available <br />
              You can create some with the <i className={theme.addIcon} /> above
            </span>
          }
        />
      );
    }

    return (
      <div className={style.rootContainer}>
        <Toolbar
          breadcrumb={awsBreadCrumb}
          title="AWS EC2"
          actions={[{ name: 'add', icon: style.addIcon }]}
          onAction={this.addItem}
          hasTabs
        />
        <div className={style.container}>
          <ActiveList
            className={style.menu}
            onActiveChange={this.activeChange}
            active={active}
            list={list}
          />
          {content}
        </div>
      </div>
    );
  }
}

AWSPrefs.propTypes = {
  active: PropTypes.number,
  list: PropTypes.array,
  error: PropTypes.string,
  buttonsDisabled: PropTypes.bool,
  user: PropTypes.object,

  onUpdateItem: PropTypes.func,
  onActiveChange: PropTypes.func,
  onAddItem: PropTypes.func,
  onRemoveItem: PropTypes.func,
  onMount: PropTypes.func,
  invalidateErrors: PropTypes.func,
};

AWSPrefs.defaultProps = {
  active: 0,
  error: null,
  buttonsDisabled: false,

  list: undefined,
  user: undefined,
  onUpdateItem: undefined,
  onActiveChange: undefined,
  onAddItem: undefined,
  onRemoveItem: undefined,
  onMount: undefined,
  invalidateErrors: undefined,
};

// Binding --------------------------------------------------------------------
/* eslint-disable arrow-body-style */

export default connect(
  (state) => {
    const localState = state.preferences.aws;

    return {
      active: localState.active,
      list: localState.list,
      buttonsDisabled: localState.pending,
      error: getNetworkError(state, ['save_aws_profile', 'remove_aws_profile']),
      user: state.auth.user,
    };
  },
  () => {
    return {
      onUpdateItem: (index, profile, server) =>
        dispatch(Actions.updateAWSProfile(index, profile, server)),
      onActiveChange: (index) => dispatch(Actions.updateActiveProfile(index)),
      onAddItem: () => dispatch(Actions.addAWSProfile()),
      onRemoveItem: (index, profile) =>
        dispatch(Actions.removeAWSProfile(index, profile)),
      onMount: () => dispatch(Actions.fetchAWSProfiles()),
      invalidateErrors: () =>
        dispatch(
          NetActions.invalidateErrors([
            'save_aws_profile',
            'remove_aws_profile',
          ])
        ),
    };
  }
)(AWSPrefs);
