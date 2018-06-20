// NOTE: next questions:
// * should the button to submit instantly? By clicking away shouldn't effectively undo what you thought you did.
// * should it really be pinned on the page? Isn't that something you're trying to move away from?
// *
// *

const bindAll = require('lodash.bindall');
const truncate = require('lodash.truncate');
const PropTypes = require('prop-types');
const React = require('react');
const FormattedMessage = require('react-intl').FormattedMessage;
const injectIntl = require('react-intl').injectIntl;
const intlShape = require('react-intl').intlShape;
const Modal = require('../base/modal.jsx');
const log = require('../../../lib/log.js');

const Form = require('../../forms/form.jsx');
const Button = require('../../forms/button.jsx');
const Select = require('../../forms/select.jsx');
const Spinner = require('../../spinner/spinner.jsx');
const TextArea = require('../../forms/textarea.jsx');
const FlexRow = require('../../flex-row/flex-row.jsx');

require('../../forms/button.scss');
require('./modal.scss');

class AddToStudioModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [ // NOTE: will need to add and bind callback fn to handle addind and removing studios
            'handleToggleAdded',
            'handleRequestClose',
            'handleSubmit'
        ]);
        // NOTE: get real data
        // this.studios = [{name: 'Funny games', id: 1}, {name: 'Silly ideas', id: 2}];
        // studios data is like:
        // [{
        //   id: 1702295,
        //   description: "...",
        //   history: {created: "2015-11-15T00:24:35.000Z",
        //   modified: "2018-05-01T00:14:48.000Z"},
        //   image: "http....png",
        //   owner: 10689298,
        //   stats: {followers: 0},
        //   title: "Studio title"
        // }, {...}]

        // NOTE: need to:
        // construct hash of inclusion status by id, populate it.
        // replace mystudios with list of studios ordered by
        // membership/stats/name. use that for rendering.
        // returning: provide the hash to handlesubmit. or
        // maybe i should calculate delta here? if studio was
        // left elsewhere and that status was not changed here,
        // prolly didn't want to be changed!

        this.state = {
            waiting: false,
            onOrDirty: {}
        };
    }

    componentDidMount() {
        this.updateOnOrDirty(this.props.projectStudios);
    }

    componentWillReceiveProps(nextProps) {
        this.updateOnOrDirty(nextProps.projectStudios);
    }

    updateOnOrDirty(projectStudios) {
        // NOTE: in theory, myStudios could have dropped some studios in
        // onOrDirty, so we should check all existing onOrDirty and drop
        // them too; otherwise we might retain a dirty change for a studio
        // we no longer have permission for. In theory.

        let onOrDirty = Object.assign({}, this.state.onOrDirty);
        projectStudios.forEach((studio) => {
            onOrDirty[studio.id] = {added: true, dirty: false};
        });
        console.log(projectStudios);
        console.log(onOrDirty);
        if (!this.deepCompare(onOrDirty, this.state.onOrDirty)) {
            this.setState({onOrDirty: Object.assign({}, onOrDirty)});
        }
    }

    deepCompare(obj1, obj2) {
        //Loop through properties in object 1
        for (var p in obj1) {
            //Check property exists on both objects
            if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;

            switch (typeof (obj1[p])) {
                //Deep compare objects
                case 'object':
                    if (!this.deepCompare(obj1[p], obj2[p])) return false;
                    break;
                //Compare values
                default:
                    if (obj1[p] != obj2[p]) return false;
            }
        }

        //Check object 2 for any extra properties
        for (var p in obj2) {
            if (typeof (obj1[p]) == 'undefined') return false;
        }
        return true;
    };

    handleToggleAdded(studioId) {
        let onOrDirty = this.state.onOrDirty;
        if (studioId in onOrDirty) {
            if (onOrDirty[studioId].added === true) {
                if (onOrDirty[studioId].dirty === true) {
                    // let's untrack the status of this studio, so it's
                    // un-added, and un-dirty again
                    delete onOrDirty[studioId];
                } else { // it started off added, so it's dirty now
                    onOrDirty[studioId].added = false;
                    onOrDirty[studioId].dirty = true;
                }
            } else {
                if (onOrDirty[studioId].dirty === true) {
                    // it was previously set to unadded. so let's set it to
                    // added, and NOT dirty. This is how it started out
                    onOrDirty[studioId].added = true;
                    onOrDirty[studioId].dirty = false;
                }
                // should never be added == false AND dirty == false
            }
        } else { // was not in onOrDirty; add it as added!
            onOrDirty[studioId] = {added: true, dirty: true};
        }
        this.setState({onOrDirty: Object.assign({}, onOrDirty)});
    }

    handleRequestClose () {
        // NOTE that we do NOT clear onOrDirty, so we don't lose
        // user's work from a stray click outside the modal...
        // but maybe this should be different?
        this.baseModal.handleRequestClose();
    }
    handleSubmit (formData) {
        // NOTE: ignoring formData for now...
        this.setState({waiting: true}, () => {
            const onOrDirty = this.state.onOrDirty;
            const studiosToAdd = Object.keys(onOrDirty)
                .reduce(function(accumulator, key) {
                    if (onOrDirty[key].dirty === true &&
                        onOrDirty[key].added === true) {
                        accumulator.push(key);
                    }
                    return accumulator;
                }, []);
            const studiosToDelete = Object.keys(onOrDirty)
                .reduce(function(accumulator, key) {
                    if (onOrDirty[key].dirty === true &&
                        onOrDirty[key].added === false) {
                        accumulator.push(key);
                    }
                    return accumulator;
                }, []);

            this.props.onAddToStudio(studiosToAdd, studiosToDelete, err => {
                if (err) log.error(err);
                // When this modal is opened, and isOpen becomes true,
                // onOrDirty should start with a clean slate
                // NOTE: this doesn't seem to be working:
                this.setState({
                    waiting: false,
                    onOrDirty: {}
                });
            });
        });
    }
    render () {
        const {
            intl,
            projectStudios,
            myStudios,
            onAddToStudio, // eslint-disable-line no-unused-vars
            type,
            ...modalProps
        } = this.props;
        const onOrDirty = this.state.onOrDirty;
        const contentLabel = intl.formatMessage({id: `addToStudio.${type}`});
        const studioButtons = myStudios.map((studio, index) => {
            const isAdded = (studio.id in onOrDirty &&
                onOrDirty[studio.id].added === true);
            return (
                <div className={"studio-selector-button" +
                    (isAdded ? " studio-selector-button-selected" : "")}
                    key={studio.id}
                    onClick={() => this.handleToggleAdded(studio.id)}
                >
                    <div className="studio-selector-button-text">
                        {truncate(studio.title, {'length': 20, 'separator': /[,:\.;]*\s+/})}
                    </div>
                    <div className={"studio-status-icon" +
                        (isAdded ? " studio-status-icon-selected" : "")}
                    >
                        {isAdded ? "✓" : "+"}
                    </div>
                </div>
            );
        });

        return (
            <Modal
                className="mod-addToStudio"
                contentLabel={contentLabel}
                ref={component => { // bind to base modal, to pass handleRequestClose through
                    this.baseModal = component;
                }}
                {...modalProps}
            >
                <div>
                    <div className="addToStudio-modal-header">
                        <div className="addToStudio-content-label">
                            {contentLabel}
                        </div>
                    </div>
                    <div className="addToStudio-modal-content">
                        <div className="studio-list-outer-scrollbox">
                            <div className="studio-list-inner-scrollbox">
                                <div className="studio-list-container">
                                    {studioButtons}
                                </div>
                            </div>
                            <div className="studio-list-bottom-gradient">
                            </div>
                        </div>


                        <Form
                            className="add-to-studio"
                            onSubmit={this.handleSubmit}
                        >
                            <FlexRow className="action-buttons">
                                <Button
                                    className="action-button close-button white"
                                    onClick={this.handleRequestClose}
                                    key="closeButton"
                                    name="closeButton"
                                    type="button"
                                >
                                    <div className="action-button-text">
                                        <FormattedMessage id="general.close" />
                                    </div>
                                </Button>
                                {this.state.addToStudioWaiting ? [
                                    <Button
                                        className="action-button submit-button"
                                        disabled="disabled"
                                        key="submitButton"
                                        type="submit"
                                    >
                                        <div className="action-button-text">
                                            <Spinner />
                                        </div>
                                    </Button>
                                ] : [
                                    <Button
                                        className="action-button submit-button"
                                        key="submitButton"
                                        type="submit"
                                    >
                                        <div className="action-button-text">
                                            <FormattedMessage id="general.okay" />
                                        </div>
                                    </Button>
                                ]}
                            </FlexRow>
                        </Form>
                    </div>
                </div>

            </Modal>
        );
    }
}

AddToStudioModal.propTypes = {
    intl: intlShape,
    projectStudios: PropTypes.arrayOf(PropTypes.object),
    myStudios: PropTypes.arrayOf(PropTypes.object),
    onAddToStudio: PropTypes.func,
    onRequestClose: PropTypes.func,
    type: PropTypes.string
};

module.exports = injectIntl(AddToStudioModal);
